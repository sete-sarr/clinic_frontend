import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, numberAttribute, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { openBlobInNewTab, triggerBlobDownload } from '../../../core/utils/file-download';
import { GENDER_LABELS, Gender, Patient } from '../patient.model';
import { PatientForm } from '../patient-form/patient-form';
import { PatientService } from '../patient.service';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-patient-list',
  imports: [
    EmptyState,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './patient-list.html',
  styleUrl: './patient-list.css',
})
export class PatientList {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly patientService = inject(PatientService);
  protected readonly auth = inject(AuthService);

  readonly search = input<string | undefined>();
  readonly gender = input<Gender | undefined>();
  readonly page = input(1, { transform: (value: unknown) => numberAttribute(value, 1) });

  protected readonly pageSize = PAGE_SIZE;
  protected readonly genderOptions = Object.entries(GENDER_LABELS) as [Gender, string][];
  protected readonly displayedColumns = ['patient_number', 'name', 'phone', 'date_of_birth', 'gender', 'actions'];

  protected readonly searchInput = signal('');
  private searchDebounceHandle?: ReturnType<typeof setTimeout>;

  protected readonly patientsResource = httpResource<Paginated<Patient>>(
    () => ({
      url: `${environment.apiBaseUrl}/patients/`,
      params: {
        page: this.page(),
        ...(this.search() ? { search: this.search()! } : {}),
        ...(this.gender() ? { gender: this.gender()! } : {}),
      },
    }),
    { defaultValue: emptyPage<Patient>() },
  );

  protected readonly dataSource = new MatTableDataSource<Patient>([]);
  protected readonly totalCount = computed(() => this.patientsResource.value().count);

  protected readonly canManage = computed(() => this.auth.hasRole('secretary', 'clinic_admin'));
  protected readonly canDeactivate = computed(() => this.auth.hasRole('clinic_admin'));
  // business/reporting-export-policy.md: patient statement is a financial report — accountant/secretary/
  // clinic_admin may view it, doctor may not.
  protected readonly canViewStatement = computed(() => this.auth.hasRole('secretary', 'accountant', 'clinic_admin'));

  constructor() {
    effect(() => {
      this.dataSource.data = this.patientsResource.value().results;
    });
    effect(() => {
      this.searchInput.set(this.search() ?? '');
    });
  }

  protected genderLabel(patient: Patient): string {
    return GENDER_LABELS[patient.gender];
  }

  protected onSearchInput(value: string): void {
    this.searchInput.set(value);
    clearTimeout(this.searchDebounceHandle);
    this.searchDebounceHandle = setTimeout(() => {
      this.router.navigate([], {
        queryParams: { search: value || null, page: null },
        queryParamsHandling: 'merge',
      });
    }, SEARCH_DEBOUNCE_MS);
  }

  protected onGenderFilterChange(gender: Gender | ''): void {
    this.router.navigate([], { queryParams: { gender: gender || null, page: null }, queryParamsHandling: 'merge' });
  }

  protected onPageChange(event: PageEvent): void {
    this.router.navigate([], { queryParams: { page: event.pageIndex + 1 }, queryParamsHandling: 'merge' });
  }

  protected openCreate(): void {
    if (!this.canManage()) {
      return;
    }
    const ref = this.dialog.open(PatientForm, { width: '720px', maxWidth: '95vw', autoFocus: 'first-tabbable' });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.patientsResource.reload();
      }
    });
  }

  protected openEdit(patient: Patient): void {
    if (!this.canManage()) {
      return;
    }
    const ref = this.dialog.open(PatientForm, {
      width: '720px',
      maxWidth: '95vw',
      data: { id: String(patient.id) },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.patientsResource.reload();
      }
    });
  }

  protected deactivate(patient: Patient): void {
    const confirmed = confirm(
      `Désactiver ${patient.first_name} ${patient.last_name} (${patient.patient_number}) ?`,
    );
    if (!confirmed) {
      return;
    }
    this.patientService.deactivate(patient.id).subscribe(() => this.patientsResource.reload());
  }

  protected downloadStatement(patient: Patient): void {
    this.patientService.downloadStatementPdf(patient.id).subscribe((blob) => openBlobInNewTab(blob));
  }

  protected exportCsv(): void {
    this.patientService.exportCsv().subscribe((blob) => triggerBlobDownload(blob, 'patients-export.csv'));
  }
}
