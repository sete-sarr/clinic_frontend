import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { LabOrder, referenceRange } from '../../laboratory/laboratory.model';
import { MedicalRecord } from '../../medical-records/medical-record.model';
import { Prescription } from '../../prescriptions/prescription.model';

const API = environment.apiBaseUrl;

// Dossier du patient hospitalisé, en lecture seule, dans la fiche de séjour (access-policy.md §
// INFIRMIER) : allergies et antécédents, prescriptions en cours, résultats de laboratoire validés.
// Chaque API applique son propre périmètre (infirmier : patients hospitalisés uniquement ; médecin :
// ses prescriptions et demandes) ; ce composant n'interroge que les modules ouverts au rôle connecté.
@Component({
  selector: 'app-inpatient-summary',
  imports: [DatePipe, MatIconModule, TranslocoPipe],
  templateUrl: './inpatient-summary.html',
  styleUrl: './inpatient-summary.css',
})
export class InpatientSummary {
  private readonly auth = inject(AuthService);

  readonly patient = input.required<number>();

  protected readonly referenceRange = referenceRange;
  // Dossier médical : médecin et infirmier (l'administrateur n'y a pas accès, medical_records/permissions.py).
  protected readonly seesRecord = computed(() => this.auth.hasRole('doctor', 'nurse'));

  private readonly recordListResource = httpResource<Paginated<MedicalRecord>>(
    () => (this.seesRecord() ? { url: `${API}/medical-records/`, params: { patient: this.patient() } } : undefined),
    { defaultValue: emptyPage<MedicalRecord>() },
  );
  // Lecture du dossier par son détail : c'est elle qui est auditée (MedicalRecordViewSet.retrieve).
  protected readonly recordResource = httpResource<MedicalRecord | null>(
    () => {
      const record = this.recordListResource.value().results[0];
      return record ? `${API}/medical-records/${record.id}/` : undefined;
    },
    { defaultValue: null },
  );
  protected readonly prescriptionsResource = httpResource<Paginated<Prescription>>(
    () => ({ url: `${API}/prescriptions/`, params: { patient: this.patient(), status: 'validated' } }),
    { defaultValue: emptyPage<Prescription>() },
  );
  protected readonly labResource = httpResource<Paginated<LabOrder>>(
    () => ({ url: `${API}/laboratory/orders/`, params: { patient: this.patient(), status: 'validated' } }),
    { defaultValue: emptyPage<LabOrder>() },
  );

  protected readonly prescriptionItems = computed(() =>
    this.prescriptionsResource.value().results.flatMap((prescription) =>
      prescription.items.map((item) => ({ ...item, date: prescription.created_at })),
    ),
  );
}
