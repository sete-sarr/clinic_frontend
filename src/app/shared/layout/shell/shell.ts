import { httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { Clinic } from '../../../core/models/clinic.model';
import { Role } from '../../../core/models/user.model';
import { ThemeService } from '../../../core/services/theme.service';
import { GlobalSearch } from '../../components/global-search/global-search';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: Role[];
}

// Mirrors backend/accounts/migrations/0002_seed_roles.py — no equivalent display label existed
// anywhere in the frontend before this.
const ROLE_LABEL: Record<Role, string> = {
  clinic_admin: 'Administrateur',
  doctor: 'Médecin',
  secretary: 'Secrétaire',
  accountant: 'Comptable',
  patient: 'Patient',
};

// Highest-privilege-first — a user with multiple roles shows only one label in the header chip.
const ROLE_PRIORITY: Role[] = ['clinic_admin', 'doctor', 'accountant', 'secretary', 'patient'];

// Only lists routes that actually exist. Append an entry here (with the roles allowed to see it,
// per business/access-policy.md) each time a new feature module lands.
const NAV_ITEMS: NavItem[] = [
  {
    label: 'Tableau de bord',
    icon: 'dashboard',
    route: '/dashboard',
    roles: ['doctor', 'secretary', 'accountant', 'clinic_admin'],
  },
  {
    label: 'Rendez-vous',
    icon: 'event',
    route: '/appointments',
    // CanManageAppointments (backend/appointments/permissions.py): patient read-only access is
    // scoped to their own appointments and belongs to the future patient portal, not this staff shell.
    roles: ['doctor', 'secretary', 'clinic_admin'],
  },
  {
    label: 'Patients',
    icon: 'people',
    route: '/patients',
    // CanManagePatients (backend/patients/permissions.py): read access for all clinic staff roles.
    roles: ['doctor', 'secretary', 'accountant', 'clinic_admin'],
  },
  {
    label: 'Consultations',
    icon: 'medical_information',
    route: '/consultations',
    // CanManageConsultations (backend/consultations/permissions.py): clinical data, doctor/clinic_admin
    // only — secretary/accountant must never see this entry (business/access-policy.md).
    roles: ['doctor', 'clinic_admin'],
  },
  {
    label: 'Dossiers médicaux',
    icon: 'folder_shared',
    route: '/medical-records',
    // CanAccessMedicalRecord (backend/medical_records/permissions.py): doctor only — even
    // clinic_admin is excluded here, unlike every other module.
    roles: ['doctor'],
  },
  {
    label: 'Prescriptions',
    icon: 'description',
    route: '/prescriptions',
    // CanManagePrescriptions (backend/prescriptions/permissions.py): doctor/clinic_admin only.
    roles: ['doctor', 'clinic_admin'],
  },
  {
    label: 'Facturation',
    icon: 'receipt_long',
    route: '/billing',
    // CanManageInvoices (backend/billing/permissions.py): read access for secretary/accountant/
    // clinic_admin/doctor.
    roles: ['secretary', 'accountant', 'clinic_admin', 'doctor'],
  },
  {
    label: 'Paiements',
    icon: 'payments',
    route: '/payments',
    // CanManagePayments (backend/payments/permissions.py): same read audience as billing.
    roles: ['secretary', 'accountant', 'clinic_admin', 'doctor'],
  },
  {
    label: "Journal d'audit",
    icon: 'history',
    route: '/audit-log',
    // AuditLogViewSet (backend/common/api/views.py): clinic_admin only.
    roles: ['clinic_admin'],
  },
  {
    label: "Rapport d'activité",
    icon: 'summarize',
    route: '/reports',
    // ClinicActivityReportView (backend/reports/api/views.py): clinic_admin only.
    roles: ['clinic_admin'],
  },
  {
    label: 'Médecins',
    icon: 'medical_services',
    route: '/doctors',
    // CanManageDoctors (backend/doctors/permissions.py): read access for all clinic staff roles.
    roles: ['doctor', 'secretary', 'accountant', 'clinic_admin'],
  },
  {
    label: 'Personnel',
    icon: 'people',
    route: '/staff',
    // StaffViewSet (backend/accounts/api/views.py): clinic_admin only, business/permissions-matrix.md
    // UTILISATEURS.
    roles: ['clinic_admin'],
  },
  {
    label: 'Paramètres',
    icon: 'settings',
    route: '/settings',
    // ClinicViewSet.get_permissions() (backend/clinics/api/views.py): clinic_admin only, same
    // pattern as Staff/Journal d'audit/Rapport d'activité.
    roles: ['clinic_admin'],
  },
  {
    label: 'Départements',
    icon: 'apartment',
    route: '/departments',
    // CanManageDepartments (backend/departments/permissions.py): read for all staff, write for
    // clinic_admin only — the route itself is admin-only (app.routes.ts canAccessDepartments),
    // same pattern as Staff/Journal d'audit/Rapport d'activité/Paramètres.
    roles: ['clinic_admin'],
  },
  {
    label: 'Abonnement',
    icon: 'workspace_premium',
    route: '/subscription',
    // CheckoutSessionView/BillingPortalView (backend/subscriptions/api/views.py): IsClinicAdmin
    // only, same pattern as Staff/Journal d'audit/Rapport d'activité/Paramètres.
    roles: ['clinic_admin'],
  },
];

@Component({
  selector: 'app-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    GlobalSearch,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatSidenavModule,
    MatToolbarModule,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly themeService = inject(ThemeService);

  protected readonly isHandset = toSignal(
    this.breakpointObserver.observe(Breakpoints.Handset).pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  protected readonly user = this.auth.user;

  protected readonly navItems = computed(() =>
    NAV_ITEMS.filter((item) => this.auth.hasRole(...item.roles)),
  );

  // Mirrors GlobalSearchView's role gates (backend/common/api/search.py) — every group there
  // requires at least doctor/secretary/accountant/clinic_admin, so a patient account never sees
  // a search box with guaranteed-empty results.
  protected readonly canSearch = computed(() =>
    this.auth.hasRole('doctor', 'secretary', 'accountant', 'clinic_admin'),
  );

  // Sidebar branding — falls back to the local_hospital icon + text when no logo is uploaded yet
  // (Settings feature, features/settings/settings.ts). Only .brand is wired; favicon application
  // is deferred (build/SSR concern, out of scope here).
  private readonly clinicResource = httpResource<Clinic | null>(
    () => (this.user()?.clinic ? { url: `${environment.apiBaseUrl}/clinics/${this.user()!.clinic}/` } : undefined),
    { defaultValue: null },
  );

  protected readonly logoUrl = computed(() => {
    const clinic = this.clinicResource.value();
    if (!clinic) {
      return null;
    }
    const isDark = this.themeService.effectiveTheme() === 'dark';
    return (isDark ? clinic.logo_dark || clinic.logo_light : clinic.logo_light || clinic.logo_dark) || null;
  });

  protected readonly primaryRoleLabel = computed(() => {
    const roles = this.auth.roles();
    const primary = ROLE_PRIORITY.find((role) => roles.includes(role));
    return primary ? ROLE_LABEL[primary] : '';
  });

  protected readonly userInitials = computed(() => {
    const current = this.user();
    if (!current) {
      return '';
    }
    const first = current.first_name?.[0] ?? '';
    const last = current.last_name?.[0] ?? '';
    return (first + last).toUpperCase() || current.username[0]?.toUpperCase() || '';
  });

  protected logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
