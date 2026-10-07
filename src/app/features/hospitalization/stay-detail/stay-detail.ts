import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { parseApiError } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { openBlobInNewTab } from '../../../core/utils/file-download';
import { SuccessNotifier } from '../../../shared/notifications/success-notifier';
import {
  ADMISSION_STATUS_LABELS,
  ADMISSION_STATUS_TONES,
  Admission,
  NursingNote,
  VitalSign,
} from '../hospitalization.model';
import { HospitalizationService } from '../hospitalization.service';
import { BedChoiceDialog } from '../stay-dialogs/bed-choice-dialog';
import { DischargeDialog } from '../stay-dialogs/discharge-dialog';
import { VITAL_FIELDS, VitalSignDialog } from '../stay-dialogs/vital-sign-dialog';

// Fiche de séjour. Les boutons suivent la machine à états et le rôle (permissions-matrix.md §
// HOSPITALISATION, CONSTANTES ET NOTES DE SOINS) ; le backend revérifie chaque action et ne renvoie
// à chaque rôle que les champs permis (la réception ne reçoit ni motif ni soins).
@Component({
  selector: 'app-stay-detail',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslocoPipe,
  ],
  templateUrl: './stay-detail.html',
  styleUrls: ['../../../shared/styles/list-page.css', '../../../shared/styles/detail-page.css', './stay-detail.css'],
})
export class StayDetail {
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly hospitalizationService = inject(HospitalizationService);
  private readonly successNotifier = inject(SuccessNotifier);

  readonly id = input.required({ transform: (value: unknown) => numberAttribute(value) });

  protected readonly statusLabels = ADMISSION_STATUS_LABELS;
  protected readonly statusTones = ADMISSION_STATUS_TONES;
  protected readonly vitalFields = VITAL_FIELDS;

  protected readonly stayResource = httpResource<Admission>(() => `${this.hospitalizationService.admissionsUrl}${this.id()}/`);
  private readonly updated = signal<Admission | null>(null);
  protected readonly stay = computed(() => this.updated() ?? this.stayResource.value() ?? null);

  protected readonly isClinical = computed(() => this.auth.hasRole('doctor', 'nurse', 'clinic_admin'));
  private readonly isDoctor = computed(() => this.auth.hasRole('doctor') && this.auth.user()?.doctor_id != null);
  private readonly isCarer = computed(() => this.auth.hasRole('doctor', 'nurse'));
  private readonly status = computed(() => this.stay()?.status);

  protected readonly canAdmit = computed(() => this.isDoctor() && this.status() === 'planned');
  protected readonly canCancel = computed(
    () => (this.isDoctor() || this.auth.hasRole('clinic_admin')) && this.status() === 'planned',
  );
  protected readonly canTransfer = computed(() => this.isCarer() && this.status() === 'admitted');
  protected readonly canDischarge = computed(() => this.isDoctor() && this.status() === 'admitted');
  protected readonly canRecordCare = computed(() => this.isCarer() && this.status() === 'admitted');
  protected readonly canPrint = computed(() => this.isClinical() && this.status() === 'discharged');

  // Soins : chargés seulement pour les rôles cliniques (403 pour les autres).
  protected readonly vitalsResource = httpResource<VitalSign[]>(
    () => (this.isClinical() ? `${this.hospitalizationService.admissionsUrl}${this.id()}/vitals/` : undefined),
    { defaultValue: [] },
  );
  protected readonly notesResource = httpResource<NursingNote[]>(
    () => (this.isClinical() ? `${this.hospitalizationService.admissionsUrl}${this.id()}/notes/` : undefined),
    { defaultValue: [] },
  );

  protected readonly noteDraft = signal('');
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected location(stay: Admission): string {
    return stay.room_number ? `${stay.room_number} — ${stay.bed_label}` : '—';
  }

  protected vitalValue(vital: VitalSign, key: string): string {
    const value = (vital as unknown as Record<string, string | number | null>)[key];
    return value === null || value === undefined ? '—' : String(value);
  }

  protected openBedChoice(mode: 'admit' | 'transfer'): void {
    const ref = this.dialog.open(BedChoiceDialog, { width: '560px', maxWidth: '95vw', data: { admission: this.stay()!, mode } });
    ref.afterClosed().subscribe((stay?: Admission) => this.applied(stay, `hospitalization.done.${mode}`));
  }

  protected openDischarge(): void {
    const ref = this.dialog.open(DischargeDialog, { width: '600px', maxWidth: '95vw', data: this.stay()! });
    ref.afterClosed().subscribe((stay?: Admission) => this.applied(stay, 'hospitalization.done.discharge'));
  }

  protected openVitals(): void {
    const ref = this.dialog.open(VitalSignDialog, { width: '720px', maxWidth: '95vw', data: this.id() });
    ref.afterClosed().subscribe((vital?: VitalSign) => {
      if (vital) {
        this.successNotifier.show(translate('hospitalization.done.vitals'));
        this.vitalsResource.reload();
      }
    });
  }

  protected cancel(): void {
    if (!confirm(translate('hospitalization.confirmCancel'))) {
      return;
    }
    this.hospitalizationService.cancel(this.id()).subscribe({
      next: (stay) => this.applied(stay, 'hospitalization.done.cancel'),
      error: (error) => this.error.set(parseApiError(error, translate('hospitalization.saveError')).message),
    });
  }

  protected addNote(): void {
    const note = this.noteDraft().trim();
    if (!note) {
      return;
    }
    this.pending.set(true);
    this.error.set(null);
    this.hospitalizationService.addNote(this.id(), note).subscribe({
      next: () => {
        this.pending.set(false);
        this.noteDraft.set('');
        this.successNotifier.show(translate('hospitalization.done.note'));
        this.notesResource.reload();
      },
      error: (error) => {
        this.pending.set(false);
        this.error.set(parseApiError(error, translate('hospitalization.saveError')).message);
      },
    });
  }

  protected downloadPdf(): void {
    this.hospitalizationService.downloadPdf(this.id()).subscribe((blob) => openBlobInNewTab(blob));
  }

  private applied(stay: Admission | undefined, successKey: string): void {
    if (stay) {
      this.updated.set(stay);
      this.successNotifier.show(translate(successKey));
    }
  }
}
