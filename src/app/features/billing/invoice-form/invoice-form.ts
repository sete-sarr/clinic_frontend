import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FieldTree, FormField, applyEach, disabled, form, min, required, schema, submit } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { environment } from '../../../../environments/environment';
import { parseApiError } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { DoctorSummary } from '../../../core/models/doctor.model';
import { PatientSummary } from '../../../core/models/patient.model';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { Medication } from '../../../core/models/pharmacy.model';
import { parseIsoDate, toIsoDate } from '../../../core/utils/date';
import { SuccessNotifier } from '../../../shared/notifications/success-notifier';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import {
  DEFAULT_VAT_RATE,
  INVOICE_STATUS_LABELS,
  Invoice,
  InvoiceLine,
  InvoicePayload,
  LOCKED_INVOICE_STATUSES,
} from '../invoice.model';
import { InvoiceService } from '../invoice.service';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, Payment, PaymentMethod } from '../../payments/payment.model';
import { PaymentService } from '../../payments/payment.service';

export interface InvoiceFormDialogData {
  id?: string;
}

interface InvoiceFormModel {
  patient: number | null;
  doctor: number | null;
  issue_date: Date | null;
  vat_rate: number;
  lines: InvoiceLine[];
}

interface PaymentEntryModel {
  amount: number;
  method: PaymentMethod;
  date: Date | null;
}

function emptyPaymentEntry(): PaymentEntryModel {
  return { amount: 0, method: 'cash', date: new Date() };
}

function emptyLine(): InvoiceLine {
  return { description: '', quantity: 1, unit_price: 0, medication: null };
}

function formatPatient(patient: PatientSummary): string {
  return `${patient.first_name} ${patient.last_name} (${patient.patient_number})`;
}

function formatDoctor(doctor: DoctorSummary): string {
  const fullName = `${doctor.user.first_name} ${doctor.user.last_name}`.trim();
  return fullName || doctor.user.username;
}

const lineSchema = schema<InvoiceLine>((line) => {
  required(line.description, { message: translate('common.validation.descriptionRequired') });
  required(line.quantity, { message: translate('prescriptions.quantityRequired') });
  min(line.quantity, 1, { message: translate('prescriptions.quantityMin') });
  required(line.unit_price, { message: translate('billing.unitPriceRequired') });
  min(line.unit_price, 0, { message: translate('billing.priceNotNegative') });
});

@Component({
  selector: 'app-invoice-form',
  imports: [
    DatePipe,
    EmptyState,
    FormField,
    RouterLink,
    MatAutocompleteModule,
    MatButtonModule,
    MatChipsModule,
    MatDialogModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TranslocoPipe,
    MatTooltipModule,
  ],
  templateUrl: './invoice-form.html',
  styleUrl: './invoice-form.css',
})
export class InvoiceForm {
  private readonly invoiceService = inject(InvoiceService);
  private readonly paymentService = inject(PaymentService);
  private readonly successNotifier = inject(SuccessNotifier);
  protected readonly auth = inject(AuthService);
  protected readonly dialogRef = inject(MatDialogRef<InvoiceForm>);
  private readonly data = inject<InvoiceFormDialogData>(MAT_DIALOG_DATA, { optional: true });

  protected readonly currentId = signal<string | undefined>(this.data?.id);

  protected readonly isEditMode = computed(() => this.currentId() !== undefined);
  protected readonly formatDoctor = formatDoctor;
  protected readonly statusLabels = INVOICE_STATUS_LABELS;

  protected readonly invoiceResource = httpResource<Invoice | null>(
    () => (this.currentId() ? { url: `${environment.apiBaseUrl}/billing/${this.currentId()}/` } : undefined),
    { defaultValue: null },
  );

  protected readonly currentStatus = computed(() => this.invoiceResource.value()?.status ?? 'draft');
  protected readonly isLocked = computed(() => LOCKED_INVOICE_STATUSES.has(this.currentStatus()));
  // CanManageInvoices.has_object_permission (backend/billing/permissions.py) : le/la secrétaire peut créer
  // mais ne peut pas modifier/émettre une facture existante — seuls accountant/clinic_admin le peuvent à partir d'ici.
  protected readonly canEditExisting = computed(() => this.auth.hasRole('accountant', 'clinic_admin'));
  protected readonly formEditable = computed(
    () => !this.isLocked() && (!this.isEditMode() || this.canEditExisting()),
  );
  // CanAccessMedicalRecord (backend/medical_records/permissions.py) : réservé au médecin, même clinic_admin
  // en est exclu (contrairement à tous les autres modules — voir l'entrée de navigation "Dossiers médicaux" de shell.ts) —
  // secretary/accountant qui gèrent la facturation ne doivent jamais non plus y accéder depuis ici.
  protected readonly canViewMedicalRecord = computed(() => this.auth.hasRole('doctor'));

  protected readonly model = signal<InvoiceFormModel>({
    patient: null,
    doctor: null,
    issue_date: new Date(),
    vat_rate: DEFAULT_VAT_RATE,
    lines: [emptyLine()],
  });

  protected readonly estimatedTotals = computed(() => {
    const value = this.model();
    const subtotal = value.lines.reduce(
      (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_price) || 0),
      0,
    );
    const vatAmount = subtotal * (Number(value.vat_rate) || 0);
    return { subtotal, vatAmount, total: subtotal + vatAmount };
  });

  protected readonly patientQuery = signal('');
  protected readonly patientLabel = signal('');

  protected readonly patientsResource = httpResource<Paginated<PatientSummary>>(
    () => ({
      url: `${environment.apiBaseUrl}/patients/`,
      params: { search: this.patientQuery(), page_size: 10 },
    }),
    { defaultValue: emptyPage<PatientSummary>() },
  );

  protected readonly doctorsResource = httpResource<Paginated<DoctorSummary>>(
    () => ({ url: `${environment.apiBaseUrl}/doctors/`, params: { page_size: 100 } }),
    { defaultValue: emptyPage<DoctorSummary>() },
  );

  // Catalogue pharmacie (lecture ouverte à tout le personnel, CanManageMedications) — seuls les
  // médicaments actifs sont proposés pour une nouvelle ligne.
  protected readonly medicationsResource = httpResource<Paginated<Medication>>(
    () => ({ url: `${environment.apiBaseUrl}/pharmacy/medications/`, params: { is_active: true, page_size: 200 } }),
    { defaultValue: emptyPage<Medication>() },
  );

  private readonly medicationsById = computed(
    () => new Map(this.medicationsResource.value().results.map((medication) => [medication.id, medication])),
  );

  protected medicationFor(id: number | null | undefined): Medication | undefined {
    return id == null ? undefined : this.medicationsById().get(id);
  }

  // Erreur des actions Émettre/Annuler (ex. stock insuffisant à l'émission), hors du formulaire.
  protected readonly actionError = signal<string | null>(null);

  protected readonly invoiceForm = form(this.model, (path) => {
    disabled(path, () => !this.formEditable());
    required(path.patient, { message: translate('common.validation.patientRequired') });
    required(path.issue_date, { message: translate('billing.issueDateRequired') });
    applyEach(path.lines, lineSchema);
  });

  // CanManagePayments (backend/payments/permissions.py) : la création est réservée à accountant/clinic_admin ;
  // le remboursement nécessite une vérification explicite de clinic_admin dans la vue.
  protected readonly methodLabels = PAYMENT_METHOD_LABELS;
  protected readonly methodOptions = Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][];
  protected readonly paymentStatusLabels = PAYMENT_STATUS_LABELS;
  protected readonly canRecordPayment = computed(() => this.auth.hasRole('accountant', 'clinic_admin'));
  protected readonly canRefund = computed(() => this.auth.hasRole('clinic_admin'));

  protected readonly paymentsResource = httpResource<Paginated<Payment>>(
    () =>
      this.currentId()
        ? {
            url: `${environment.apiBaseUrl}/payments/`,
            params: { invoice: this.currentId()!, page_size: 50 },
          }
        : undefined,
    { defaultValue: emptyPage<Payment>() },
  );

  protected readonly paymentEntry = signal<PaymentEntryModel>(emptyPaymentEntry());

  protected readonly paymentForm = form(this.paymentEntry, (path) => {
    required(path.amount, { message: translate('payments.amountRequired') });
    min(path.amount, 0.01, { message: translate('payments.amountPositive') });
    required(path.method, { message: translate('payments.methodRequired') });
    required(path.date, { message: translate('common.validation.dateRequired') });
  });

  constructor() {
    effect(() => {
      const invoice = this.invoiceResource.value();
      if (invoice) {
        this.model.set({
          patient: invoice.patient,
          doctor: invoice.doctor,
          issue_date: parseIsoDate(invoice.issue_date),
          vat_rate: Number(invoice.vat_rate),
          lines: invoice.lines.length > 0 ? invoice.lines : [emptyLine()],
        });
        this.patientLabel.set(invoice.patient_display);
      }
    });
  }

  protected onPatientQueryInput(value: string): void {
    this.patientQuery.set(value);
    this.patientLabel.set(value);
    this.invoiceForm.patient().value.set(null);
  }

  protected onPatientSelected(patient: PatientSummary): void {
    this.invoiceForm.patient().value.set(patient.id);
    this.patientLabel.set(formatPatient(patient));
  }

  protected formatPatientOption(patient: PatientSummary): string {
    return formatPatient(patient);
  }

  // Pré-remplit la ligne depuis le catalogue ; description et prix restent modifiables ensuite.
  protected onMedicationSelected(index: number, medicationId: number | null): void {
    const medication = this.medicationFor(medicationId);
    if (!medication) {
      return;
    }
    this.model.update((current) => ({
      ...current,
      lines: current.lines.map((line, i) =>
        i === index
          ? { ...line, description: `${medication.name} (${medication.unit})`, unit_price: Number(medication.unit_price) }
          : line,
      ),
    }));
  }

  protected addLine(): void {
    this.model.update((current) => ({ ...current, lines: [...current.lines, emptyLine()] }));
  }

  protected removeLine(index: number): void {
    this.model.update((current) => ({
      ...current,
      lines: current.lines.filter((_, i) => i !== index),
    }));
  }

  protected async onSubmit(): Promise<void> {
    await submit(this.invoiceForm, async () => {
      try {
        const value = this.model();
        if (!value.patient || !value.issue_date) {
          return [{ kind: 'server', message: translate('billing.patientAndDateRequired') }];
        }
        const payload: InvoicePayload = {
          patient: value.patient,
          doctor: value.doctor,
          issue_date: toIsoDate(value.issue_date),
          vat_rate: value.vat_rate,
          lines: value.lines.map(({ id: _lineId, line_total: _lineTotal, ...line }) => line),
        };

        const id = this.currentId();
        if (id) {
          await firstValueFrom(this.invoiceService.update(Number(id), payload));
          this.successNotifier.show(translate('billing.updated'));
          this.dialogRef.close(true);
        } else {
          const created = await firstValueFrom(this.invoiceService.create(payload));
          this.currentId.set(String(created.id));
          this.invoiceResource.reload();
          this.successNotifier.show(translate('billing.created'));
        }
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, translate('billing.saveError'));
        const fieldsByName = {
          patient: this.invoiceForm.patient,
          doctor: this.invoiceForm.doctor,
          issue_date: this.invoiceForm.issue_date,
          vat_rate: this.invoiceForm.vat_rate,
        } as Record<string, FieldTree<unknown>>;
        const fieldTree = apiError.field ? fieldsByName[apiError.field] : undefined;
        return [{ kind: 'server', message: apiError.message, fieldTree }];
      }
    });
  }

  protected issueInvoice(): void {
    const id = this.currentId();
    if (!id) {
      return;
    }
    this.actionError.set(null);
    this.invoiceService.issue(Number(id)).subscribe({
      next: () => {
        this.invoiceResource.reload();
        this.medicationsResource.reload();
      },
      error: (error) => this.actionError.set(parseApiError(error, translate('billing.issueError')).message),
    });
  }

  protected cancelInvoice(): void {
    const id = this.currentId();
    if (!id) {
      return;
    }
    const confirmed = confirm(translate('billing.confirmCancel'));
    if (!confirmed) {
      return;
    }
    this.actionError.set(null);
    this.invoiceService.cancel(Number(id)).subscribe({
      next: () => {
        this.invoiceResource.reload();
        this.medicationsResource.reload();
      },
      error: (error) => this.actionError.set(parseApiError(error, translate('billing.cancelError')).message),
    });
  }

  protected downloadPdf(): void {
    const id = this.currentId();
    if (!id) {
      return;
    }
    this.invoiceService.downloadPdf(Number(id)).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    });
  }

  protected async addPayment(): Promise<void> {
    const id = this.currentId();
    if (!id) {
      return;
    }
    await submit(this.paymentForm, async () => {
      const value = this.paymentEntry();
      try {
        await firstValueFrom(
          this.paymentService.create({
            invoice: Number(id),
            amount: value.amount,
            method: value.method,
            date: toIsoDate(value.date!),
          }),
        );
        this.paymentEntry.set(emptyPaymentEntry());
        this.paymentsResource.reload();
        this.invoiceResource.reload();
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, translate('payments.saveError'));
        return [{ kind: 'server', message: apiError.message }];
      }
    });
  }

  protected refundPayment(payment: Payment): void {
    const confirmed = confirm(translate('payments.confirmRefund', { amount: payment.amount }));
    if (!confirmed) {
      return;
    }
    this.paymentService.refund(payment.id).subscribe(() => {
      this.paymentsResource.reload();
      this.invoiceResource.reload();
    });
  }
}
