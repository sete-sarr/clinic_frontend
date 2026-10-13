import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

import { BarcodeScanDialog } from './barcode-scan-dialog';

/** Ouvre la fenêtre de scan ; renvoie le texte lu, ou undefined si l'utilisateur l'a fermée. */
@Injectable({ providedIn: 'root' })
export class BarcodeScanner {
  private readonly dialog = inject(MatDialog);

  scan(): Promise<string | undefined> {
    const ref = this.dialog.open<BarcodeScanDialog, void, string>(BarcodeScanDialog, {
      width: '520px',
      maxWidth: '95vw',
      autoFocus: false,
    });
    return firstValueFrom(ref.afterClosed());
  }
}
