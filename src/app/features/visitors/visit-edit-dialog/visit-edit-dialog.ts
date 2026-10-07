import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';

import { VisitForm } from '../visit-form/visit-form';
import { Visit } from '../visitor.model';

// Correction d'une entrée du jour (permissions-matrix.md § REGISTRE DES VISITEURS).
@Component({
  selector: 'app-visit-edit-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, TranslocoPipe, VisitForm],
  template: `
    <div class="app-dialog-header">
      <h2 mat-dialog-title>{{ 'visitors.editTitle' | transloco }}</h2>
      <button mat-icon-button type="button" (click)="dialogRef.close()" [attr.aria-label]="'common.actions.close' | transloco">
        <mat-icon>close</mat-icon>
      </button>
    </div>
    <mat-dialog-content>
      <app-visit-form [visit]="visit" (saved)="dialogRef.close($event)" (cancelled)="dialogRef.close()" />
    </mat-dialog-content>
  `,
})
export class VisitEditDialog {
  protected readonly dialogRef = inject(MatDialogRef<VisitEditDialog, Visit>);
  protected readonly visit = inject<Visit>(MAT_DIALOG_DATA);
}
