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
  // No filter needed — MedicalRecordViewSet.get_queryset() already scopes the patient role to
  // their own single record (business/access-policy.md "Own Medical Record").
  protected readonly recordResource = httpResource<Paginated<MedicalRecord>>(
    () => ({ url: `${environment.apiBaseUrl}/medical-records/` }),
    { defaultValue: emptyPage<MedicalRecord>() },
  );

  protected readonly record = computed(() => this.recordResource.value().results[0] ?? null);
}
