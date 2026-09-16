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

// Reflète backend/accounts/migrations/0002_seed_roles.py — aucun libellé d'affichage équivalent n'existait
// nulle part dans le frontend avant cela.
const ROLE_LABEL: Record<Role, string> = {
  clinic_admin: 'Administrateur',
  doctor: 'Médecin',
  secretary: 'Secrétaire',
  accountant: 'Comptable',
  pharmacist: 'Pharmacien',
  patient: 'Patient',
};

// Du plus privilégié au moins privilégié — un utilisateur avec plusieurs rôles n'affiche qu'un seul libellé dans la puce de l'en-tête.
const ROLE_PRIORITY: Role[] = ['clinic_admin', 'doctor', 'accountant', 'pharmacist', 'secretary', 'patient'];

// Ne liste que les routes qui existent réellement. Ajouter une entrée ici (avec les rôles autorisés à la voir,
// selon business/access-policy.md) à chaque nouveau module de fonctionnalité livré.
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
    // CanManageAppointments (backend/appointments/permissions.py) : l'accès en lecture seule du patient est
    // limité à ses propres rendez-vous et relève du futur portail patient, pas de cette coquille (shell) du personnel.
    roles: ['doctor', 'secretary', 'clinic_admin'],
  },
  {
    label: 'Patients',
    icon: 'people',
    route: '/patients',
    // CanManagePatients (backend/patients/permissions.py) : accès en lecture pour tous les rôles du personnel de la clinique.
    roles: ['doctor', 'secretary', 'accountant', 'clinic_admin'],
  },
  {
    label: 'Consultations',
    icon: 'medical_information',
    route: '/consultations',
    // CanManageConsultations (backend/consultations/permissions.py) : données cliniques, doctor/clinic_admin
    // uniquement — secretary/accountant ne doivent jamais voir cette entrée (business/access-policy.md).
    roles: ['doctor', 'clinic_admin'],
  },
  {
    label: 'Dossiers médicaux',
    icon: 'folder_shared',
    route: '/medical-records',
    // CanAccessMedicalRecord (backend/medical_records/permissions.py) : doctor uniquement — même
    // clinic_admin est exclu ici, contrairement à tous les autres modules.
    roles: ['doctor'],
  },
  {
    label: 'Prescriptions',
    icon: 'description',
    route: '/prescriptions',
    // CanManagePrescriptions (backend/prescriptions/permissions.py) : doctor/clinic_admin uniquement.
    roles: ['doctor', 'clinic_admin'],
  },
  {
    label: 'Facturation',
    icon: 'receipt_long',
    route: '/billing',
    // CanManageInvoices (backend/billing/permissions.py) : accès en lecture pour secretary/accountant/
    // clinic_admin/doctor.
    roles: ['secretary', 'accountant', 'clinic_admin', 'doctor'],
  },
  {
    label: 'Paiements',
    icon: 'payments',
    route: '/payments',
    // CanManagePayments (backend/payments/permissions.py) : même public en lecture que la facturation.
    roles: ['secretary', 'accountant', 'clinic_admin', 'doctor'],
  },
  {
    label: "Journal d'audit",
    icon: 'history',
    route: '/audit-log',
    // AuditLogViewSet (backend/common/api/views.py) : clinic_admin uniquement.
    roles: ['clinic_admin'],
  },
  {
    label: "Rapport d'activité",
    icon: 'summarize',
    route: '/reports',
    // ClinicActivityReportView (backend/reports/api/views.py) : clinic_admin uniquement.
    roles: ['clinic_admin'],
  },
  {
    label: 'Médecins',
    icon: 'medical_services',
    route: '/doctors',
    // CanManageDoctors (backend/doctors/permissions.py) : accès en lecture pour tous les rôles du personnel de la clinique.
    roles: ['doctor', 'secretary', 'accountant', 'clinic_admin'],
  },
  {
    label: 'Personnel',
    icon: 'people',
    route: '/staff',
    // StaffViewSet (backend/accounts/api/views.py) : clinic_admin uniquement, business/permissions-matrix.md
    // UTILISATEURS.
    roles: ['clinic_admin'],
  },
  {
    label: 'Paramètres',
    icon: 'settings',
    route: '/settings',
    // ClinicViewSet.get_permissions() (backend/clinics/api/views.py) : clinic_admin uniquement, même
    // schéma que Staff/Journal d'audit/Rapport d'activité.
    roles: ['clinic_admin'],
  },
  {
    label: 'Départements',
    icon: 'apartment',
    route: '/departments',
    // CanManageDepartments (backend/departments/permissions.py) : lecture pour tout le personnel, écriture pour
    // clinic_admin uniquement — la route elle-même est réservée aux admins (app.routes.ts canAccessDepartments),
    // même schéma que Staff/Journal d'audit/Rapport d'activité/Paramètres.
    roles: ['clinic_admin'],
  },
  {
    label: 'Pharmacie',
    icon: 'medication',
    route: '/pharmacy',
    // CanManageMedications/CanManageStock (backend/pharmacy/permissions.py) : lecture pour tout le
    // personnel, écriture (catalogue + réception de lot) pour pharmacist/clinic_admin uniquement —
    // route réservée à ces deux rôles (app.routes.ts canAccessPharmacy), même schéma que
    // Départements (écran de gestion, pas un simple sélecteur en lecture).
    roles: ['pharmacist', 'clinic_admin'],
  },
  {
    label: 'Abonnement',
    icon: 'workspace_premium',
    route: '/subscription',
    // CheckoutSessionView/BillingPortalView (backend/subscriptions/api/views.py) : IsClinicAdmin
    // uniquement, même schéma que Staff/Journal d'audit/Rapport d'activité/Paramètres.
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

  // Reflète les contrôles de rôle de GlobalSearchView (backend/common/api/search.py) — chaque groupe y
  // exige au moins doctor/secretary/accountant/clinic_admin, donc un compte patient ne voit jamais
  // de barre de recherche avec des résultats garantis vides.
  protected readonly canSearch = computed(() =>
    this.auth.hasRole('doctor', 'secretary', 'accountant', 'clinic_admin'),
  );

  // Habillage de la sidebar — retombe sur l'icône local_hospital + texte tant qu'aucun logo n'est téléversé
  // (fonctionnalité Settings, features/settings/settings.ts). Seul .brand est câblé ; l'application du favicon
  // est reportée (préoccupation build/SSR, hors périmètre ici).
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
