import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FieldTree, FormField, email, form, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { parseApiError } from '../../../core/api/api-error';
import { STAFF_ROLE_LABELS, StaffMember, StaffRole } from '../../../core/models/staff.model';
import { SuccessNotifier } from '../../../shared/notifications/success-notifier';
import { StaffService } from '../staff.service';

export interface StaffFormDialogData {
  id?: string;
}

interface StaffFormModel {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: StaffRole;
}

@Component({
  selector: 'app-staff-form',
  imports: [
    FormField,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './staff-form.html',
  styleUrl: './staff-form.css',
})
export class StaffForm {
  private readonly staffService = inject(StaffService);
  private readonly successNotifier = inject(SuccessNotifier);
  protected readonly dialogRef = inject(MatDialogRef<StaffForm>);
  private readonly data = inject<StaffFormDialogData>(MAT_DIALOG_DATA, { optional: true });

  protected readonly currentId = signal<string | undefined>(this.data?.id);

  protected readonly isEditMode = computed(() => this.currentId() !== undefined);
  protected readonly roleOptions = Object.entries(STAFF_ROLE_LABELS) as [StaffRole, string][];

  protected readonly memberResource = httpResource<StaffMember | null>(
    () => (this.currentId() ? { url: `${environment.apiBaseUrl}/accounts/staff/${this.currentId()}/` } : undefined),
    { defaultValue: null },
  );

  protected readonly model = signal<StaffFormModel>({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'secretary',
  });

  protected readonly roleChangePending = signal(false);
  protected readonly roleChangeError = signal<string | null>(null);

  protected readonly staffForm = form(this.model, (path) => {
    required(path.first_name, { message: 'Prénom requis' });
    required(path.last_name, { message: 'Nom requis' });
    email(path.email, { message: 'Adresse e-mail invalide' });
    if (!this.isEditMode()) {
      required(path.username, { message: "Nom d'utilisateur requis" });
      required(path.password, { message: 'Mot de passe requis' });
    }
  });

  constructor() {
    effect(() => {
      const member = this.memberResource.value();
      if (member) {
        this.model.set({
          username: member.username,
          first_name: member.first_name,
          last_name: member.last_name,
          email: member.email,
          password: '',
          role: member.role,
        });
      }
    });
  }

  protected async onSubmit(): Promise<void> {
    await submit(this.staffForm, async () => {
      const value = this.model();
      try {
        const id = this.currentId();
        if (id) {
          await firstValueFrom(
            this.staffService.update(Number(id), {
              first_name: value.first_name,
              last_name: value.last_name,
              email: value.email,
            }),
          );
        } else {
          await firstValueFrom(
            this.staffService.create({
              username: value.username,
              email: value.email,
              first_name: value.first_name,
              last_name: value.last_name,
              password: value.password,
              role: value.role,
            }),
          );
        }
        this.successNotifier.show('Membre du personnel enregistré avec succès.');
        this.dialogRef.close(true);
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, "Impossible d'enregistrer ce membre du personnel.");
        const fieldsByName = {
          username: this.staffForm.username,
          first_name: this.staffForm.first_name,
          last_name: this.staffForm.last_name,
          email: this.staffForm.email,
          password: this.staffForm.password,
          role: this.staffForm.role,
        } as Record<string, FieldTree<unknown>>;
        const fieldTree = apiError.field ? fieldsByName[apiError.field] : undefined;
        return [{ kind: 'server', message: apiError.message, fieldTree }];
      }
    });
  }

  protected async onRoleChange(newRole: StaffRole): Promise<void> {
    const id = this.currentId();
    if (!id) {
      return;
    }
    this.roleChangePending.set(true);
    this.roleChangeError.set(null);
    try {
      const updated = await firstValueFrom(this.staffService.changeRole(Number(id), newRole));
      this.model.update((current) => ({ ...current, role: updated.role }));
    } catch (error) {
      const apiError = parseApiError(error, 'Impossible de changer le rôle.');
      this.roleChangeError.set(apiError.message);
    } finally {
      this.roleChangePending.set(false);
    }
  }
}
