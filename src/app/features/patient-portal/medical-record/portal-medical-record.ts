import { Component, computed } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoPipe } from '@jsverse/transloco';

import { environment } from '../../../../environments/environment';
import { MedicalRecord } from '../../medical-records/medical-record.model';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { apiResource } from '../../../core/api/api-resource';

@Component({
  selector: 'app-portal-medical-record',
  imports: [EmptyState, MatCardModule, MatProgressSpinnerModule, TranslocoPipe],
  templateUrl: './portal-medical-record.html',
  styleUrl: './portal-medical-record.css',
})
export class PortalMedicalRecord {
  // Aucun filtre nécessaire — MedicalRecordViewSet.get_queryset() restreint déjà le rôle patient à
  // son unique dossier personnel (business/access-policy.md "son propre dossier médical").
  protected readonly recordResource = apiResource<Paginated<MedicalRecord>>(
    () => ({ url: `${environment.apiBaseUrl}/medical-records/` }),
    { defaultValue: emptyPage<MedicalRecord>() },
  );

  protected readonly record = computed(() => this.recordResource.value().results[0] ?? null);
}
