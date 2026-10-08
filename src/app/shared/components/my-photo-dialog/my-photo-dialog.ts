import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { AuthService } from '../../../core/auth/auth.service';
import { PHOTO_URLS, PhotoChange, PhotoService } from '../../../core/services/photo.service';
import { SuccessNotifier } from '../../notifications/success-notifier';
import { PhotoPicker } from '../photo-picker/photo-picker';

// « Ma photo » (menu utilisateur) : chaque membre du personnel, médecin compris, gère sa propre
// photo de profil (décision produit du 2026-10-08).
@Component({
  selector: 'app-my-photo-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, MatProgressSpinnerModule, PhotoPicker, TranslocoPipe],
  template: `
    <div class="app-dialog-header">
      <h2 mat-dialog-title>{{ 'photo.myPhotoTitle' | transloco }}</h2>
      <button mat-icon-button type="button" (click)="dialogRef.close()" [attr.aria-label]="'common.actions.close' | transloco">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content>
      <app-photo-picker [currentSrc]="user()?.photo" [kind]="kind()" [name]="fullName()" [(change)]="change" />

      @if (error(); as message) {
        <p class="server-error" role="alert">{{ message }}</p>
      }

      <div class="form-actions">
        <button mat-button type="button" (click)="dialogRef.close()">{{ 'common.actions.cancel' | transloco }}</button>
        <button mat-flat-button color="primary" type="button" [disabled]="!change() || saving()" (click)="save()">
          @if (saving()) {
            <mat-spinner diameter="20" />
          } @else {
            {{ 'common.actions.save' | transloco }}
          }
        </button>
      </div>
    </mat-dialog-content>
  `,
  styles: `
    .server-error {
      color: var(--color-error);
      font-size: 0.875rem;
      margin: 0 0 var(--space-4);
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-2);
    }
  `,
})
export class MyPhotoDialog {
  private readonly auth = inject(AuthService);
  private readonly photoService = inject(PhotoService);
  private readonly successNotifier = inject(SuccessNotifier);
  protected readonly dialogRef = inject(MatDialogRef<MyPhotoDialog>);

  protected readonly user = this.auth.user;
  protected readonly kind = computed(() => (this.auth.hasRole('doctor') ? 'doctor' : 'staff'));
  protected readonly fullName = computed(() => `${this.user()?.first_name ?? ''} ${this.user()?.last_name ?? ''}`.trim());

  protected readonly change = signal<PhotoChange>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async save(): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    const error = await this.photoService.apply(PHOTO_URLS.me(), this.change());
    this.saving.set(false);
    if (error) {
      this.error.set(error);
      return;
    }
    this.auth.refreshUser();
    this.successNotifier.show(translate('photo.saved'));
    this.dialogRef.close(true);
  }
}
