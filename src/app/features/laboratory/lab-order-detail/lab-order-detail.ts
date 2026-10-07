import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, numberAttribute, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { parseApiError } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { openBlobInNewTab } from '../../../core/utils/file-download';
import { SuccessNotifier } from '../../../shared/notifications/success-notifier';
import { LabResultCorrection } from '../lab-result-correction/lab-result-correction';
import {
  LAB_ORDER_STATUS_LABELS,
  LAB_ORDER_STATUS_TONES,
  LabOrder,
  LabOrderItem,
  LabResultEntry,
  referenceRange,
} from '../laboratory.model';
import { LabOrderTransition, LaboratoryService } from '../laboratory.service';

// Fiche d'une demande d'examens. Les boutons affichés suivent la machine à états et le rôle
// (permissions-matrix.md § DEMANDE / RÉSULTAT DE LABORATOIRE) ; le backend revérifie chaque action.
@Component({
  selector: 'app-lab-order-detail',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    TranslocoPipe,
  ],
  templateUrl: './lab-order-detail.html',
  styleUrls: ['../../../shared/styles/list-page.css', '../../../shared/styles/detail-page.css', './lab-order-detail.css'],
})
export class LabOrderDetail {
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly laboratoryService = inject(LaboratoryService);
  private readonly successNotifier = inject(SuccessNotifier);

  readonly id = input.required({ transform: (value: unknown) => numberAttribute(value) });

  protected readonly statusLabels = LAB_ORDER_STATUS_LABELS;
  protected readonly statusTones = LAB_ORDER_STATUS_TONES;
  protected readonly referenceRange = referenceRange;

  protected readonly orderResource = httpResource<LabOrder>(() => `${this.laboratoryService.ordersUrl}${this.id()}/`);
  // Dernière version renvoyée par une action (évite un second aller-retour après chaque transition).
  private readonly updated = signal<LabOrder | null>(null);
  protected readonly order = computed(() => this.updated() ?? this.orderResource.value() ?? null);

  // Saisie en cours, par examen : { valeur, commentaire }.
  protected readonly drafts = signal<Record<number, { value: string; comment: string }>>({});
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly isTechnician = computed(() => this.auth.hasRole('lab_technician'));
  private readonly isPrescriber = computed(() => {
    const doctorId = this.auth.user()?.doctor_id;
    return doctorId != null && doctorId === this.order()?.doctor;
  });
  protected readonly canCollect = computed(() => this.isTechnician() && this.order()?.status === 'requested');
  protected readonly canStart = computed(() => this.isTechnician() && this.order()?.status === 'collected');
  protected readonly canEnter = computed(() => this.isTechnician() && this.order()?.status === 'in_progress');
  protected readonly canCorrect = computed(() => this.isTechnician() && this.order()?.status === 'validated');
  protected readonly canValidate = computed(() => this.isPrescriber() && this.order()?.status === 'completed');
  protected readonly canCancel = computed(
    () => (this.isPrescriber() || this.auth.hasRole('clinic_admin')) && this.order()?.status === 'requested',
  );
  protected readonly canPrint = computed(
    () => this.order()?.status === 'validated' && (this.isPrescriber() || this.auth.hasRole('clinic_admin')),
  );

  constructor() {
    effect(() => {
      const order = this.order();
      if (order) {
        this.drafts.set(
          Object.fromEntries(
            order.items.map((item) => [item.id, { value: item.result?.value ?? '', comment: item.result?.comment ?? '' }]),
          ),
        );
      }
    });
  }

  protected setDraft(item: LabOrderItem, field: 'value' | 'comment', text: string): void {
    this.drafts.update((drafts) => ({ ...drafts, [item.id]: { ...drafts[item.id], [field]: text } }));
  }

  protected transition(transition: LabOrderTransition, confirmKey?: string): void {
    if (confirmKey && !confirm(translate(confirmKey))) {
      return;
    }
    this.run(this.laboratoryService.transition(this.id(), transition), `laboratory.done.${transition}`);
  }

  protected saveResults(): void {
    const entries: LabResultEntry[] = Object.entries(this.drafts())
      .filter(([, draft]) => draft.value.trim() !== '' || draft.comment.trim() !== '')
      .map(([item, draft]) => ({ item: Number(item), value: draft.value.trim(), comment: draft.comment.trim() }));
    if (entries.length === 0) {
      return;
    }
    this.run(this.laboratoryService.recordResults(this.id(), entries), 'laboratory.done.results');
  }

  protected onFileSelected(item: LabOrderItem, input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (file) {
      this.run(this.laboratoryService.attachFile(this.id(), item.id, file), 'laboratory.done.attachment');
    }
  }

  protected openAttachment(item: LabOrderItem): void {
    this.laboratoryService.downloadAttachment(this.id(), item.id).subscribe((blob) => openBlobInNewTab(blob));
  }

  protected downloadPdf(): void {
    this.laboratoryService.downloadPdf(this.id()).subscribe((blob) => openBlobInNewTab(blob));
  }

  protected correct(item: LabOrderItem): void {
    const ref = this.dialog.open(LabResultCorrection, {
      width: '560px',
      maxWidth: '95vw',
      data: { orderId: this.id(), item },
    });
    ref.afterClosed().subscribe((order: LabOrder | undefined) => order && this.updated.set(order));
  }

  private run(request$: Observable<LabOrder>, successKey: string): void {
    this.pending.set(true);
    this.error.set(null);
    request$.subscribe({
      next: (order) => {
        this.updated.set(order);
        this.pending.set(false);
        this.successNotifier.show(translate(successKey));
      },
      error: (error) => {
        this.pending.set(false);
        this.error.set(parseApiError(error, translate('laboratory.saveError')).message);
      },
    });
  }
}
