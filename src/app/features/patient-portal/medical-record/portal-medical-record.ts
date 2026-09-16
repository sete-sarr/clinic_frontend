import { httpResource } from '@angular/common/http';
import { Component, computed } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { environment } from '../../../../environments/environment';
import { MedicalRecord } from '../../medical-records/medical-record.model';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';

@Component({
  selector: 'app-portal-medical-record',
  imports: [EmptyState, MatCardModule, MatProgressSpinnerModule],
  templateUrl: './portal-medical-record.html',
  styleUrl: './portal-medical-record.css',
})
export class PortalMedicalRecord {
  // Aucun filtre nécessaire — MedicalRecordViewSet.get_queryset() restreint déjà le rôle patient à
  // son unique dossier personnel (business/access-policy.md "son propre dossier médical").
  protected readonly recordResource = httpResource<Paginated<MedicalRecord>>(
    () => ({ url: `${environment.apiBaseUrl}/medical-records/` }),
    { defaultValue: emptyPage<MedicalRecord>() },
  );

  protected readonly record = computed(() => this.recordResource.value().results[0] ?? null);
}
