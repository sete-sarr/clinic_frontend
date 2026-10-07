import { Component, computed, effect, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { environment } from '../../../../environments/environment';
import { parseApiError } from '../../../core/api/api-error';
import {
  DEPARTMENT_TYPE_LABELS,
  Department,
  DepartmentType,
} from '../../../core/models/department.model';
import { SuccessNotifier } from '../../../shared/notifications/success-notifier';
import { DepartmentService } from '../department.service';
import { apiResource } from '../../../core/api/api-resource';

export interface DepartmentFormDialogData {
  id?: string;
}

interface DepartmentFormModel {
  name: string;
  code: string;
  department_type: DepartmentType;
  description: string;
}

@Component({
  selector: 'app-department-form',
  imports: [
    FormField,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TranslocoPipe,
  ],
  templateUrl: './department-form.html',
  styleUrl: './department-form.css',
})
export class DepartmentForm {
  private readonly departmentService = inject(DepartmentService);
  private readonly successNotifier = inject(SuccessNotifier);
  protected readonly dialogRef = inject(MatDialogRef<DepartmentForm>);
  private readonly data = inject<DepartmentFormDialogData>(MAT_DIALOG_DATA, { optional: true });

  protected readonly currentId = signal<string | undefined>(this.data?.id);

  protected readonly isEditMode = computed(() => this.currentId() !== undefined);
  protected readonly typeOptions = Object.entries(DEPARTMENT_TYPE_LABELS) as [DepartmentType, string][];

  protected readonly departmentResource = apiResource<Department | null>(
    () => (this.currentId() ? { url: `${environment.apiBaseUrl}/departments/${this.currentId()}/` } : undefined),
    { defaultValue: null },
  );

  protected readonly isArchived = computed(() => this.departmentResource.value()?.status === 'archived');

  protected readonly model = signal<DepartmentFormModel>({
    name: '',
    code: '',
    department_type: 'medical',
    description: '',
  });

  protected readonly departmentForm = form(this.model, (path) => {
    required(path.name, { message: translate('departments.nameRequired') });
    maxLength(path.name, 150, { message: translate('departments.nameTooLong') });
    required(path.code, { message: translate('departments.codeRequired') });
    maxLength(path.code, 30, { message: translate('departments.codeTooLong') });
    required(path.department_type, { message: translate('departments.typeRequired') });
  });

  constructor() {
    effect(() => {
      const department = this.departmentResource.value();
      if (department) {
        this.model.set({
          name: department.name,
          code: department.code,
          department_type: department.department_type,
          description: department.description,
        });
      }
    });
  }

  protected async onSubmit(): Promise<void> {
    await submit(this.departmentForm, async () => {
      const value = this.model();
      try {
        const id = this.currentId();
        if (id) {
          await firstValueFrom(this.departmentService.update(Number(id), value));
        } else {
          await firstValueFrom(this.departmentService.create(value));
        }
        this.successNotifier.show(translate('departments.saved'));
        this.dialogRef.close(true);
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, translate('departments.saveError'));
        const fieldsByName = {
          name: this.departmentForm.name,
          code: this.departmentForm.code,
          department_type: this.departmentForm.department_type,
          description: this.departmentForm.description,
        } as Record<string, FieldTree<unknown>>;
        const fieldTree = apiError.field ? fieldsByName[apiError.field] : undefined;
        return [{ kind: 'server', message: apiError.message, fieldTree }];
      }
    });
  }
}
