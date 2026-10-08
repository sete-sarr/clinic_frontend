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
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { environment } from '../../../../environments/environment';
import { parseApiError } from '../../../core/api/api-error';
import { STAFF_ROLE_LABELS, StaffMember, StaffRole } from '../../../core/models/staff.model';
import { SuccessNotifier } from '../../../shared/notifications/success-notifier';
import { StaffService } from '../staff.service';
import { apiResource } from '../../../core/api/api-resource';
import { PHOTO_URLS, PhotoChange, PhotoService } from '../../../core/services/photo.service';
import { PhotoPicker } from '../../../shared/components/photo-picker/photo-picker';

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
    PhotoPicker,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TranslocoPipe,
  ],
  templateUrl: './staff-form.html',
  styleUrl: './staff-form.css',
})
export class StaffForm {
  private readonly staffService = inject(StaffService);
  private readonly photoService = inject(PhotoService);
  private readonly successNotifier = inject(SuccessNotifier);
  protected readonly dialogRef = inject(MatDialogRef<StaffForm>);
  private readonly data = inject<StaffFormDialogData>(MAT_DIALOG_DATA, { optional: true });

  protected readonly currentId = signal<string | undefined>(this.data?.id);

  protected readonly isEditMode = computed(() => this.currentId() !== undefined);
  protected readonly roleOptions = Object.entries(STAFF_ROLE_LABELS) as [StaffRole, string][];

  protected readonly memberResource = apiResource<StaffMember | null>(
    () => (this.currentId() ? { url: `${environment.apiBaseUrl}/accounts/staff/${this.currentId()}/` } : undefined),
    { defaultValue: null },
  );

  // Photo du membre, appliquée après l'enregistrement de la fiche.
  protected readonly photoChange = signal<PhotoChange>(null);
  protected readonly currentPhoto = computed(() => this.memberResource.value()?.photo ?? null);
  // Un médecin peut être ouvert depuis cette liste (rôle « doctor » en lecture seule).
  protected readonly photoKind = computed(() =>
    (this.memberResource.value()?.role as string | undefined) === 'doctor' ? 'doctor' : 'staff',
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
    required(path.first_name, { message: translate('common.validation.firstNameRequired') });
    required(path.last_name, { message: translate('common.validation.lastNameRequired') });
    required(path.email, { message: translate('common.validation.emailRequiredFem') });
    email(path.email, { message: translate('common.validation.emailInvalid') });
    if (!this.isEditMode()) {
      required(path.username, { message: translate('common.validation.usernameRequired') });
      required(path.password, { message: translate('common.validation.passwordRequired') });
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
        let saved: StaffMember;
        if (id) {
          saved = await firstValueFrom(
            this.staffService.update(Number(id), {
              first_name: value.first_name,
              last_name: value.last_name,
              email: value.email,
            }),
          );
        } else {
          saved = await firstValueFrom(
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
        // Fiche enregistrée : en cas d'échec de la photo, le formulaire reste ouvert, en modification.
        this.currentId.set(String(saved.id));
        const photoError = await this.photoService.apply(PHOTO_URLS.staff(saved.id), this.photoChange());
        if (photoError) {
          return [{ kind: 'server', message: photoError }];
        }
        this.successNotifier.show(translate('staff.saved'));
        this.dialogRef.close(true);
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, translate('staff.saveError'));
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
      const apiError = parseApiError(error, translate('staff.roleChangeError'));
      this.roleChangeError.set(apiError.message);
    } finally {
      this.roleChangePending.set(false);
    }
  }
}
