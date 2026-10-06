import { httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
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
import { UserGuideService } from '../../../core/services/user-guide.service';
import { GlobalSearch } from '../../components/global-search/global-search';
import { LanguageSwitcher } from '../../components/language-switcher/language-switcher';
import { TranslocoPipe } from '@jsverse/transloco';
import { APP_NAME } from '../../../core/brand';

interface NavItem {
  labelKey: string; // clé de traduction (i18n/*.json → nav.*)
  icon: string;
  route: string;
  roles: Role[];
}

// Du plus privilégié au moins privilégié — un utilisateur avec plusieurs rôles n'affiche qu'un seul libellé dans la puce de l'en-tête.
const ROLE_PRIORITY: Role[] = ['clinic_admin', 'doctor', 'accountant', 'pharmacist', 'secretary', 'patient'];

// Ne liste que les routes qui existent réellement. Ajouter une entrée ici (avec les rôles autorisés à la voir,
// selon business/access-policy.md) à chaque nouveau module de fonctionnalité livré.
// Ordre du menu : groupes de fonctionnalités liées, séparés par un trait dans la barre latérale.
// Un groupe sans entrée visible pour le rôle connecté est masqué avec son séparateur.
const NAV_GROUPS: string[][] = [
  ['/dashboard'],
  ['/appointments', '/patients'], // accueil
  ['/consultations', '/medical-records', '/prescriptions', '/pharmacy'], // soins
  ['/billing', '/payments'], // finances
  ['/reports', '/audit-log'], // pilotage
  ['/doctors', '/staff', '/departments'], // organisation de la clinique
  ['/settings', '/subscription'], // compte de la clinique
];

const NAV_ITEMS: NavItem[] = [
  {
    labelKey: 'nav.dashboard',
    icon: 'dashboard',
    route: '/dashboard',
    roles: ['doctor', 'secretary', 'accountant', 'clinic_admin'],
  },
  {
    labelKey: 'nav.appointments',
    icon: 'event',
    route: '/appointments',
    // CanManageAppointments (backend/appointments/permissions.py) : l'accès en lecture seule du patient est
    // limité à ses propres rendez-vous et relève du futur portail patient, pas de cette coquille (shell) du personnel.
    roles: ['doctor', 'secretary', 'clinic_admin'],
  },
  {
    labelKey: 'nav.patients',
    icon: 'people',
    route: '/patients',
    // CanManagePatients (backend/patients/permissions.py) : accès en lecture pour tous les rôles du personnel de la clinique.
    roles: ['doctor', 'secretary', 'accountant', 'clinic_admin'],
  },
  {
    labelKey: 'nav.consultations',
    icon: 'medical_information',
    route: '/consultations',
    // CanManageConsultations (backend/consultations/permissions.py) : données cliniques, doctor/clinic_admin
    // uniquement — secretary/accountant ne doivent jamais voir cette entrée (business/access-policy.md).
    roles: ['doctor', 'clinic_admin'],
  },
  {
    labelKey: 'nav.medicalRecords',
    icon: 'folder_shared',
    route: '/medical-records',
    // CanAccessMedicalRecord (backend/medical_records/permissions.py) : doctor uniquement — même
    // clinic_admin est exclu ici, contrairement à tous les autres modules.
    roles: ['doctor'],
  },
  {
    labelKey: 'nav.prescriptions',
    icon: 'description',
    route: '/prescriptions',
    // CanManagePrescriptions (backend/prescriptions/permissions.py) : doctor/clinic_admin uniquement.
    roles: ['doctor', 'clinic_admin'],
  },
  {
    labelKey: 'nav.billing',
    icon: 'receipt_long',
    route: '/billing',
    // CanManageInvoices (backend/billing/permissions.py) : accès en lecture pour secretary/accountant/
    // clinic_admin/doctor.
    roles: ['secretary', 'accountant', 'clinic_admin', 'doctor'],
  },
  {
    labelKey: 'nav.payments',
    icon: 'payments',
    route: '/payments',
    // CanManagePayments (backend/payments/permissions.py) : même public en lecture que la facturation.
    roles: ['secretary', 'accountant', 'clinic_admin', 'doctor'],
  },
  {
    labelKey: 'nav.auditLog',
    icon: 'history',
    route: '/audit-log',
    // AuditLogViewSet (backend/common/api/views.py) : clinic_admin uniquement.
    roles: ['clinic_admin'],
  },
  {
    labelKey: 'nav.activityReport',
    icon: 'summarize',
    route: '/reports',
    // ClinicActivityReportView (backend/reports/api/views.py) : clinic_admin uniquement.
    roles: ['clinic_admin'],
  },
  {
    labelKey: 'nav.doctors',
    icon: 'medical_services',
    route: '/doctors',
    // CanManageDoctors (backend/doctors/permissions.py) : accès en lecture pour tous les rôles du personnel de la clinique.
    roles: ['doctor', 'secretary', 'accountant', 'clinic_admin'],
  },
  {
    labelKey: 'nav.staff',
    icon: 'people',
    route: '/staff',
    // StaffViewSet (backend/accounts/api/views.py) : clinic_admin uniquement, business/permissions-matrix.md
    // UTILISATEURS.
    roles: ['clinic_admin'],
  },
  {
    labelKey: 'nav.settings',
    icon: 'settings',
    route: '/settings',
    // ClinicViewSet.get_permissions() (backend/clinics/api/views.py) : clinic_admin uniquement, même
    // schéma que Staff/Journal d'audit/Rapport d'activité.
    roles: ['clinic_admin'],
  },
  {
    labelKey: 'nav.departments',
    icon: 'apartment',
    route: '/departments',
    // CanManageDepartments (backend/departments/permissions.py) : lecture pour tout le personnel, écriture pour
    // clinic_admin uniquement — la route elle-même est réservée aux admins (app.routes.ts canAccessDepartments),
    // même schéma que Staff/Journal d'audit/Rapport d'activité/Paramètres.
    roles: ['clinic_admin'],
  },
  {
    labelKey: 'nav.pharmacy',
    icon: 'medication',
    route: '/pharmacy',
    // CanManageMedications/CanManageStock (backend/pharmacy/permissions.py) : lecture pour tout le
    // personnel, écriture (catalogue + réception de lot) pour pharmacist/clinic_admin uniquement —
    // route réservée à ces deux rôles (app.routes.ts canAccessPharmacy), même schéma que
    // Départements (écran de gestion, pas un simple sélecteur en lecture).
    roles: ['pharmacist', 'clinic_admin'],
  },
  {
    labelKey: 'nav.subscription',
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
    LanguageSwitcher,
    TranslocoPipe,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatListModule,
    MatMenuModule,
    MatSidenavModule,
    MatToolbarModule,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  protected readonly appName = APP_NAME;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly themeService = inject(ThemeService);

  protected readonly isHandset = toSignal(
    this.breakpointObserver.observe(Breakpoints.Handset).pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  protected readonly user = this.auth.user;

  constructor() {
    // Réglages de la clinique modifiés depuis la connexion (devise…) : docs/i18n.md §8.
    this.auth.refreshUser();
  }

  protected readonly navGroups = computed(() =>
    NAV_GROUPS.map((routes) =>
      routes
        .map((route) => NAV_ITEMS.find((item) => item.route === route))
        .filter((item): item is NavItem => !!item && this.auth.hasRole(...item.roles)),
    ).filter((group) => group.length > 0),
  );

  // Reflète les contrôles de rôle de GlobalSearchView (backend/common/api/search.py) — chaque groupe y
  // exige au moins doctor/secretary/accountant/clinic_admin, donc un compte patient ne voit jamais
  // de barre de recherche avec des résultats garantis vides.
  protected readonly canSearch = computed(() =>
    this.auth.hasRole('doctor', 'secretary', 'accountant', 'clinic_admin'),
  );

  private readonly userGuideService = inject(UserGuideService);
  protected readonly canDownloadUserGuide = computed(() => this.auth.hasRole('clinic_admin'));

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

  // Clé de traduction du rôle principal (i18n/*.json → roles.*, mêmes valeurs que
  // backend/accounts/migrations/0002_seed_roles.py).
  protected readonly primaryRoleKey = computed(() => {
    const roles = this.auth.roles();
    const primary = ROLE_PRIORITY.find((role) => roles.includes(role));
    return primary ? `roles.${primary}` : '';
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

  protected downloadUserGuide(): void {
    this.userGuideService.download();
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
