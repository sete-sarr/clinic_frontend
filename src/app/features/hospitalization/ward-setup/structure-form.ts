import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { environment } from '../../../../environments/environment';
import { parseApiError } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { DepartmentSummary } from '../../../core/models/department.model';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { DEFAULT_CURRENCY, currencySymbol } from '../../../core/utils/money';
import { Bed, Room, RoomType } from '../hospitalization.model';
import { HospitalizationService, StructureKind } from '../hospitalization.service';
import { apiResource } from '../../../core/api/api-resource';

export interface StructureFormData {
  kind: StructureKind;
  item?: RoomType | Room | Bed;
}

// Création / modification d'un type de chambre, d'une chambre ou d'un lit (administrateur) : une
// seule fenêtre, les champs dépendent du type d'élément.
@Component({
  selector: 'app-structure-form',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TranslocoPipe,
  ],
  templateUrl: './structure-form.html',
  styleUrl: '../hospitalization-form.css',
})
export class StructureForm {
  private readonly hospitalizationService = inject(HospitalizationService);
  protected readonly dialogRef = inject(MatDialogRef<StructureForm>);
  protected readonly data = inject<StructureFormData>(MAT_DIALOG_DATA);
  protected readonly currencySymbol = currencySymbol(inject(AuthService).user()?.clinic_currency ?? DEFAULT_CURRENCY);

  // Valeurs du formulaire, initialisées depuis l'élément modifié.
  protected readonly values = signal<Record<string, string | number | null>>({ ...(this.data.item ?? {}) } as never);
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly departmentsResource = apiResource<Paginated<DepartmentSummary>>(
    () => (this.data.kind === 'rooms' ? { url: `${environment.apiBaseUrl}/departments/`, params: { page_size: 200 } } : undefined),
    { defaultValue: emptyPage<DepartmentSummary>() },
  );
  protected readonly roomTypesResource = apiResource<Paginated<RoomType>>(
    () => (this.data.kind === 'rooms' ? { url: this.hospitalizationService.structureUrl('room-types'), params: { is_active: 'true', page_size: 200 } } : undefined),
    { defaultValue: emptyPage<RoomType>() },
  );
  protected readonly roomsResource = apiResource<Paginated<Room>>(
    () => (this.data.kind === 'beds' ? { url: this.hospitalizationService.structureUrl('rooms'), params: { is_active: 'true', page_size: 200 } } : undefined),
    { defaultValue: emptyPage<Room>() },
  );

  protected value(key: string): string | number | null {
    return this.values()[key] ?? null;
  }

  protected set(key: string, value: string | number | null): void {
    this.values.update((current) => ({ ...current, [key]: value }));
  }

  private payload(): object {
    const v = this.values();
    switch (this.data.kind) {
      case 'room-types':
        return { name: v['name'], nightly_rate: v['nightly_rate'] };
      case 'rooms':
        return { number: v['number'], department: v['department'], room_type: v['room_type'] };
      default:
        return { label: v['label'], room: v['room'] };
    }
  }

  protected save(): void {
    this.pending.set(true);
    this.error.set(null);
    this.hospitalizationService.saveStructure(this.data.kind, this.payload(), this.data.item?.id).subscribe({
      next: () => this.dialogRef.close(true),
      error: (error) => {
        this.pending.set(false);
        this.error.set(parseApiError(error, translate('hospitalization.saveError')).message);
      },
    });
  }
}
