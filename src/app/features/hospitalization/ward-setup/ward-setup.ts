import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { parseApiError } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { DEFAULT_CURRENCY, MoneyPipe } from '../../../core/utils/money';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { SuccessNotifier } from '../../../shared/notifications/success-notifier';
import { BED_STATUS_LABELS, Bed, Room, RoomType } from '../hospitalization.model';
import { HospitalizationService, StructureKind } from '../hospitalization.service';
import { StructureForm } from './structure-form';
import { apiResource } from '../../../core/api/api-resource';

const LIST_SIZE = 200;

// Paramétrage des types de chambre, chambres et lits (administrateur — permissions-matrix.md §
// CHAMBRES ET LITS). Archivage uniquement, jamais de suppression ; un lit ou une chambre occupé ne
// peut pas être archivé (contrôlé par le backend).
@Component({
  selector: 'app-ward-setup',
  imports: [
    EmptyState,
    MoneyPipe,
    NgTemplateOutlet,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatTabsModule,
    MatTooltipModule,
    TranslocoPipe,
  ],
  templateUrl: './ward-setup.html',
  styleUrls: ['../../../shared/styles/list-page.css', './ward-setup.css'],
})
export class WardSetup {
  private readonly dialog = inject(MatDialog);
  private readonly hospitalizationService = inject(HospitalizationService);
  private readonly successNotifier = inject(SuccessNotifier);
  protected readonly currency = inject(AuthService).user()?.clinic_currency ?? DEFAULT_CURRENCY;
  protected readonly bedStatusLabels = BED_STATUS_LABELS;

  private resource<T>(kind: StructureKind) {
    return apiResource<Paginated<T>>(
      () => ({ url: this.hospitalizationService.structureUrl(kind), params: { page_size: LIST_SIZE } }),
      { defaultValue: emptyPage<T>() },
    );
  }

  protected readonly roomTypes = this.resource<RoomType>('room-types');
  protected readonly rooms = this.resource<Room>('rooms');
  protected readonly beds = this.resource<Bed>('beds');

  protected readonly pending = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected open(kind: StructureKind, item?: RoomType | Room | Bed): void {
    const ref = this.dialog.open(StructureForm, { width: '520px', maxWidth: '95vw', data: { kind, item } });
    ref.afterClosed().subscribe((saved) => {
      if (saved) {
        this.successNotifier.show(translate('hospitalization.setup.saved'));
        this.reload();
      }
    });
  }

  protected toggle(kind: StructureKind, item: RoomType | Room | Bed): void {
    this.pending.set(`${kind}-${item.id}`);
    this.error.set(null);
    this.hospitalizationService.setStructureActive(kind, item.id, !item.is_active).subscribe({
      next: () => {
        this.pending.set(null);
        this.successNotifier.show(translate(item.is_active ? 'hospitalization.setup.archived' : 'hospitalization.setup.restored'));
        this.reload();
      },
      error: (error) => {
        this.pending.set(null);
        this.error.set(parseApiError(error, translate('hospitalization.saveError')).message);
      },
    });
  }

  private reload(): void {
    this.roomTypes.reload();
    this.rooms.reload();
    this.beds.reload();
  }
}
