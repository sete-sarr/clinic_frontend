import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { parseApiError } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { SuccessNotifier } from '../../../shared/notifications/success-notifier';
import { AdmissionForm } from '../admission-form/admission-form';
import { Admission, BED_STATUSES, BED_STATUS_LABELS, BED_STATUS_TONES, Bed, BedStatus } from '../hospitalization.model';
import { BedTransition, HospitalizationService } from '../hospitalization.service';
import { apiResource } from '../../../core/api/api-resource';

interface RoomGroup {
  number: string;
  typeName: string;
  beds: Bed[];
}

interface DepartmentGroup {
  name: string;
  rooms: RoomGroup[];
}

// Tableau d'occupation des lits par service (docs/hospitalization.md §8). La réception y voit
// l'emplacement des patients (nom, chambre, lit), jamais le motif ; le lien vers le séjour n'est
// proposé qu'aux rôles cliniques.
@Component({
  selector: 'app-ward-board',
  imports: [
    EmptyState,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    TranslocoPipe,
  ],
  templateUrl: './ward-board.html',
  styleUrls: ['../../../shared/styles/list-page.css', './ward-board.css'],
})
export class WardBoard {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly hospitalizationService = inject(HospitalizationService);
  private readonly successNotifier = inject(SuccessNotifier);

  protected readonly statuses = BED_STATUSES;
  protected readonly statusLabels = BED_STATUS_LABELS;
  protected readonly statusTones = BED_STATUS_TONES;

  protected readonly canAdmit = computed(() => this.auth.hasRole('doctor') && this.auth.user()?.doctor_id != null);
  protected readonly canOpenStay = computed(() => this.auth.hasRole('doctor', 'nurse', 'clinic_admin'));
  protected readonly canClean = computed(() => this.auth.hasRole('nurse', 'clinic_admin'));
  protected readonly isAdmin = computed(() => this.auth.hasRole('clinic_admin'));

  protected readonly department = signal<number | null>(null);
  protected readonly pending = signal<number | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly bedsResource = apiResource<Bed[]>(() => this.hospitalizationService.boardUrl, { defaultValue: [] });

  protected readonly departments = computed(() => {
    const seen = new Map<number, string>();
    for (const bed of this.bedsResource.value()) {
      seen.set(bed.department, bed.department_name);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  });

  private readonly visibleBeds = computed(() =>
    this.bedsResource.value().filter((bed) => this.department() === null || bed.department === this.department()),
  );

  protected readonly counts = computed(() => {
    const counts = Object.fromEntries(BED_STATUSES.map((status) => [status, 0])) as Record<BedStatus, number>;
    for (const bed of this.visibleBeds()) {
      counts[bed.status] += 1;
    }
    return counts;
  });

  protected readonly groups = computed<DepartmentGroup[]>(() => {
    const departments = new Map<string, Map<string, RoomGroup>>();
    for (const bed of this.visibleBeds()) {
      const rooms = departments.get(bed.department_name) ?? new Map<string, RoomGroup>();
      const room = rooms.get(bed.room_number) ?? { number: bed.room_number, typeName: bed.room_type_name, beds: [] };
      room.beds.push(bed);
      rooms.set(bed.room_number, room);
      departments.set(bed.department_name, rooms);
    }
    return [...departments.entries()].map(([name, rooms]) => ({ name, rooms: [...rooms.values()] }));
  });

  protected openAdmission(): void {
    const ref = this.dialog.open(AdmissionForm, { width: '640px', maxWidth: '95vw', autoFocus: 'first-tabbable' });
    ref.afterClosed().subscribe((admission: Admission | undefined) => {
      if (admission) {
        this.router.navigate(['/hospitalization/stays', admission.id]);
      }
    });
  }

  protected bedAction(bed: Bed, transition: BedTransition): void {
    this.pending.set(bed.id);
    this.error.set(null);
    this.hospitalizationService.bedTransition(bed.id, transition).subscribe({
      next: () => {
        this.pending.set(null);
        this.successNotifier.show(translate(`hospitalization.done.bed.${transition}`));
        this.bedsResource.reload();
      },
      error: (error) => {
        this.pending.set(null);
        this.error.set(parseApiError(error, translate('hospitalization.saveError')).message);
      },
    });
  }
}
