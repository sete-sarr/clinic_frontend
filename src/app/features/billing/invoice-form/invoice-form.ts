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
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { parseApiError } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { DoctorSummary } from '../../../core/models/doctor.model';
import { PatientSummary } from '../../../core/models/patient.model';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
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
  return { description: '', quantity: 1, unit_price: 0 };
}

function formatPatient(patient: PatientSummary): string {
  return `${patient.first_name} ${patient.last_name} (${patient.patient_number})`;
}

function formatDoctor(doctor: DoctorSummary): string {
  const fullName = `${doctor.user.first_name} ${doctor.user.last_name}`.trim();
  return fullName || doctor.user.username;
}

const lineSchema = schema<InvoiceLine>((line) => {
  required(line.description, { message: 'Description requise' });
  required(line.quantity, { message: 'Quantité requise' });
  min(line.quantity, 1, { message: 'Quantité minimale : 1' });
  required(line.unit_price, { message: 'Prix unitaire requis' });
  min(line.unit_price, 0, { message: 'Le prix ne peut pas être négatif' });
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
  // CanManageInvoices.has_object_permission (backend/billing/permissions.py): secretary can create
  // but cannot edit/issue an existing invoice — only accountant/clinic_admin can from here on.
  protected readonly canEditExisting = computed(() => this.auth.hasRole('accountant', 'clinic_admin'));
  protected readonly formEditable = computed(
    () => !this.isLocked() && (!this.isEditMode() || this.canEditExisting()),
  );
  // CanAccessMedicalRecord (backend/medical_records/permissions.py): doctor-only, even clinic_admin
  // is excluded (unlike every other module — see shell.ts's "Dossiers médicaux" nav entry) —
  // secretary/accountant handling billing must never get a path into it from here either.
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

  protected readonly invoiceForm = form(this.model, (path) => {
    disabled(path, () => !this.formEditable());
    required(path.patient, { message: 'Patient requis' });
    required(path.issue_date, { message: "Date d'émission requise" });
    applyEach(path.lines, lineSchema);
  });

  // CanManagePayments (backend/payments/permissions.py): create is accountant/clinic_admin only;
  // refund requires an explicit clinic_admin check in the view.
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
    required(path.amount, { message: 'Montant requis' });
    min(path.amount, 0.01, { message: 'Le montant doit être positif' });
    required(path.method, { message: 'Méthode requise' });
    required(path.date, { message: 'Date requise' });
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
          return [{ kind: 'server', message: 'Patient et date requis.' }];
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
          this.successNotifier.show('Facture mise à jour avec succès.');
          this.dialogRef.close(true);
        } else {
          const created = await firstValueFrom(this.invoiceService.create(payload));
          this.currentId.set(String(created.id));
          this.invoiceResource.reload();
          this.successNotifier.show('Facture créée avec succès.');
        }
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, "Impossible d'enregistrer la facture.");
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
    this.invoiceService.issue(Number(id)).subscribe(() => this.invoiceResource.reload());
  }

  protected cancelInvoice(): void {
    const id = this.currentId();
    if (!id) {
      return;
    }
    const confirmed = confirm('Annuler cette facture ? Cette action est définitive.');
    if (!confirmed) {
      return;
    }
    this.invoiceService.cancel(Number(id)).subscribe(() => this.invoiceResource.reload());
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
        const apiError = parseApiError(error, "Impossible d'enregistrer le paiement.");
        return [{ kind: 'server', message: apiError.message }];
      }
    });
  }

  protected refundPayment(payment: Payment): void {
    const confirmed = confirm(`Rembourser le paiement de ${payment.amount} ?`);
    if (!confirmed) {
      return;
    }
    this.paymentService.refund(payment.id).subscribe(() => {
      this.paymentsResource.reload();
      this.invoiceResource.reload();
    });
  }
}
