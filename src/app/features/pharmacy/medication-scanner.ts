import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { translate } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { parseApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { MedicationScan } from '../../core/models/pharmacy.model';
import { BarcodeScanner } from '../../shared/barcode/barcode-scanner';
import { MedicationForm } from './medication-form/medication-form';
import { MedicationService } from './medication.service';

/** Issue d'un scan : le code lu et interprété par le serveur, ou le message d'erreur à afficher. */
export type MedicationScanOutcome = { scan: MedicationScan } | { error: string };

// Scan d'une boîte de médicament, partagé par la pharmacie (fiche, liste, réception) et la
// facturation : caméra ou douchette -> GET /pharmacy/medications/scan/ (GTIN, lot, péremption et
// médicament de la clinique).
@Injectable({ providedIn: 'root' })
export class MedicationScanner {
  private readonly barcodeScanner = inject(BarcodeScanner);
  private readonly medicationService = inject(MedicationService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  /** undefined : fenêtre fermée sans lecture. */
  async scan(): Promise<MedicationScanOutcome | undefined> {
    const code = await this.barcodeScanner.scan();
    if (!code) {
      return undefined;
    }
    try {
      return { scan: await firstValueFrom(this.medicationService.scan(code)) };
    } catch (error) {
      return { error: parseApiError(error, translate('pharmacy.scan.error')).message };
    }
  }

  /** Création d'un médicament au catalogue : pharmacien et administrateur (CanManageMedications). */
  canCreate(): boolean {
    return this.auth.hasRole('pharmacist', 'clinic_admin');
  }

  /** Code inconnu : message, avec « Créer » pour qui peut ajouter le médicament au catalogue. */
  reportUnknown(scan: MedicationScan, onCreated?: () => void): void {
    const ref = this.snackBar.open(
      translate('pharmacy.scan.unknown', { code: scan.gtin }),
      this.canCreate() ? translate('pharmacy.scan.create') : undefined,
      { duration: 8000 },
    );
    ref.onAction().subscribe(async () => {
      if (await this.openCreate(scan.gtin)) {
        onCreated?.();
      }
    });
  }

  /** Fiche de création avec le code-barres déjà rempli ; true si le médicament a été créé. */
  async openCreate(barcode: string): Promise<boolean> {
    const ref = this.dialog.open(MedicationForm, { width: '640px', maxWidth: '95vw', data: { barcode } });
    return !!(await firstValueFrom(ref.afterClosed()));
  }
}
