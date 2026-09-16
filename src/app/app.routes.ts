import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guard';
import { roleGuard, staffAreaGuard } from './core/auth/role.guard';

// CanManageConsultations (backend/consultations/permissions.py) : doctor/clinic_admin uniquement, en
// lecture ET en écriture — secretary/accountant ne doivent jamais accéder aux données cliniques
// (business/access-policy.md : "Receptionist ... Cannot access ... Diagnosis, Medical Notes, ... Consultations").
const canAccessConsultations = roleGuard('doctor', 'clinic_admin');
// CanAccessMedicalRecord (backend/medical_records/permissions.py) : doctor uniquement — contrairement
// à tous les autres modules, clinic_admin n'a PAS accès ici (business/access-policy.md : donnée
// clinique la plus stricte).
const canAccessMedicalRecords = roleGuard('doctor');
// CanManagePrescriptions (backend/prescriptions/permissions.py) : doctor/clinic_admin — l'accès en
// lecture seule du patient lui-même relève du futur portail patient, pas de cette coquille staff.
const canAccessPrescriptions = roleGuard('doctor', 'clinic_admin');
// CanManageInvoices (backend/billing/permissions.py) : accès en lecture pour secretary/accountant/
// clinic_admin/doctor ; l'accès en lecture seule du patient lui-même relève du futur portail patient.
const canAccessBilling = roleGuard('secretary', 'accountant', 'clinic_admin', 'doctor');
// CanManagePayments (backend/payments/permissions.py) : même audience en lecture que billing. Les
// paiements ne sont jamais créés que dans le contexte d'une facture (features/billing/invoice-form),
// jamais depuis un écran autonome "nouveau paiement" — cette route est uniquement de la
// consultation/de l'audit.
const canAccessPayments = roleGuard('secretary', 'accountant', 'clinic_admin', 'doctor');
const canAccessPortal = roleGuard('patient');
// AuditLogViewSet (backend/common/api/views.py) : clinic_admin uniquement, selon business/access-policy.md
// "Clinic Administrator: Can access ... All Audit Logs".
const canAccessAuditLog = roleGuard('clinic_admin');
// ClinicActivityReportView (backend/reports/api/views.py) : clinic_admin uniquement, selon
// business/reporting-export-policy.md.
const canAccessReports = roleGuard('clinic_admin');
// StaffViewSet (backend/accounts/api/views.py) : clinic_admin uniquement, en lecture ET en écriture,
// selon business/permissions-matrix.md UTILISATEURS (comptes secretary/accountant/clinic_admin
// uniquement — les comptes doctor restent gérés sous /doctors, les comptes patient sous le flux
// d'activation OTP).
const canAccessStaff = roleGuard('clinic_admin');
// Branding/préférences de la clinique (logo, langue, thème) — configuration au niveau clinique, même
// motif IsClinicAdmin que ClinicViewSet applique déjà pour PATCH (backend/clinics/api/views.py), pas
// la catégorie "Paramètres Système" réservée au Super-Admin dans business/permissions-matrix.md.
const canAccessSettings = roleGuard('clinic_admin');
// CheckoutSessionView/BillingPortalView (backend/subscriptions/api/views.py) : IsClinicAdmin
// uniquement — l'abonnement à la plateforme est facturé à la clinique, géré par son administrateur,
// jamais par le personnel clinique/d'accueil.
const canAccessSubscription = roleGuard('clinic_admin');
// CanManageDepartments (backend/departments/permissions.py) : lecture pour tout membre du personnel
// authentifié, écriture (créer/modifier/archiver/restaurer) pour clinic_admin uniquement — la route
// elle-même est réservée aux admins selon business/workflow-policy.md "Seuls les Administrateurs de
// Clinique peuvent archiver ou restaurer des départements" (le personnel accède aux départements en
// lecture seule via des sélecteurs, par ex. le formulaire médecin).
const canAccessDepartments = roleGuard('clinic_admin');

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register-clinic/register-clinic').then((m) => m.RegisterClinic),
    canActivate: [guestGuard],
  },
  {
    path: 'activate',
    loadComponent: () =>
      import('./features/patient-portal/activation/activation').then((m) => m.Activation),
    canActivate: [guestGuard],
  },
  {
    path: 'portal',
    loadComponent: () => import('./shared/layout/portal-shell/portal-shell').then((m) => m.PortalShell),
    canActivate: [authGuard, canAccessPortal],
    children: [
      { path: '', redirectTo: 'appointments', pathMatch: 'full' },
      {
        path: 'appointments',
        loadComponent: () =>
          import('./features/patient-portal/appointments/portal-appointments').then(
            (m) => m.PortalAppointments,
          ),
      },
      {
        path: 'prescriptions',
        loadComponent: () =>
          import('./features/patient-portal/prescriptions/portal-prescriptions').then(
            (m) => m.PortalPrescriptions,
          ),
      },
      {
        path: 'invoices',
        loadComponent: () =>
          import('./features/patient-portal/invoices/portal-invoices').then((m) => m.PortalInvoices),
      },
      {
        path: 'medical-record',
        loadComponent: () =>
          import('./features/patient-portal/medical-record/portal-medical-record').then(
            (m) => m.PortalMedicalRecord,
          ),
      },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./shared/layout/shell/shell').then((m) => m.Shell),
    canActivate: [authGuard, staffAreaGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'appointments',
        loadComponent: () =>
          import('./features/appointments/appointment-list/appointment-list').then(
            (m) => m.AppointmentList,
          ),
      },
      {
        path: 'patients',
        loadComponent: () =>
          import('./features/patients/patient-list/patient-list').then((m) => m.PatientList),
      },
      {
        path: 'consultations',
        canActivate: [canAccessConsultations],
        loadComponent: () =>
          import('./features/consultations/consultation-list/consultation-list').then(
            (m) => m.ConsultationList,
          ),
      },
      {
        path: 'medical-records',
        canActivate: [canAccessMedicalRecords],
        loadComponent: () =>
          import('./features/medical-records/medical-record-list/medical-record-list').then(
            (m) => m.MedicalRecordList,
          ),
      },
      {
        path: 'prescriptions',
        canActivate: [canAccessPrescriptions],
        loadComponent: () =>
          import('./features/prescriptions/prescription-list/prescription-list').then(
            (m) => m.PrescriptionList,
          ),
      },
      {
        path: 'billing',
        canActivate: [canAccessBilling],
        loadComponent: () =>
          import('./features/billing/invoice-list/invoice-list').then((m) => m.InvoiceList),
      },
      {
        path: 'payments',
        canActivate: [canAccessPayments],
        loadComponent: () =>
          import('./features/payments/payment-list/payment-list').then((m) => m.PaymentList),
      },
      {
        path: 'audit-log',
        canActivate: [canAccessAuditLog],
        loadComponent: () =>
          import('./features/audit-log/audit-log-list/audit-log-list').then((m) => m.AuditLogList),
      },
      {
        path: 'reports',
        canActivate: [canAccessReports],
        loadComponent: () =>
          import('./features/reports/activity-report/activity-report').then((m) => m.ActivityReport),
      },
      {
        path: 'staff',
        canActivate: [canAccessStaff],
        loadComponent: () => import('./features/staff/staff-list/staff-list').then((m) => m.StaffList),
      },
      {
        path: 'doctors',
        loadComponent: () => import('./features/doctors/doctor-list/doctor-list').then((m) => m.DoctorList),
      },
      {
        path: 'settings',
        canActivate: [canAccessSettings],
        loadComponent: () => import('./features/settings/settings').then((m) => m.Settings),
      },
      {
        path: 'departments',
        canActivate: [canAccessDepartments],
        loadComponent: () =>
          import('./features/departments/department-list/department-list').then((m) => m.DepartmentList),
      },
      {
        path: 'subscription',
        canActivate: [canAccessSubscription],
        loadComponent: () => import('./features/subscription/subscription').then((m) => m.Subscription),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
