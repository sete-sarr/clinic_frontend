import { Component, ElementRef, OnDestroy, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslocoPipe } from '@jsverse/transloco';
import type { IScannerControls } from '@zxing/browser';

import { injectIsHandset } from '../../core/utils/handset';

type CameraState = 'starting' | 'scanning' | 'unavailable' | 'denied';

// Lecture d'un code-barres (EAN/UPC des boîtes, DataMatrix GS1) avec la caméra — téléphone, tablette,
// webcam, application Android et exécutable Windows : même code (ZXing, chargé à l'ouverture
// seulement). Une douchette (lecteur qui tape le code puis Entrée) ou la saisie au clavier passent
// par le champ, toujours présent. Se ferme sur le texte lu, brut : son interprétation (GTIN, lot,
// péremption) revient au backend.
@Component({
  selector: 'app-barcode-scan-dialog',
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule, TranslocoPipe],
  templateUrl: './barcode-scan-dialog.html',
  styleUrl: './barcode-scan-dialog.css',
})
export class BarcodeScanDialog implements OnDestroy {
  protected readonly dialogRef = inject(MatDialogRef<BarcodeScanDialog, string>);
  private readonly isHandset = injectIsHandset();
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private readonly manualInput = viewChild.required<ElementRef<HTMLInputElement>>('manualInput');

  protected readonly cameraState = signal<CameraState>('starting');
  protected readonly manualCode = signal('');
  private controls?: IScannerControls;
  private closed = false;

  constructor() {
    afterNextRender(() => {
      // Sur ordinateur, le champ garde le focus pour une douchette ; sur téléphone, le clavier
      // masquerait la caméra.
      if (!this.isHandset()) {
        this.manualInput().nativeElement.focus();
      }
      void this.startCamera();
    });
  }

  private async startCamera(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraState.set('unavailable');
      return;
    }
    try {
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
        import('@zxing/browser'),
        import('@zxing/library'),
      ]);
      const hints = new Map<number, unknown>([
        [
          DecodeHintType.POSSIBLE_FORMATS,
          [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.DATA_MATRIX, BarcodeFormat.CODE_128],
        ],
        [DecodeHintType.TRY_HARDER, true],
      ]);
      const reader = new BrowserMultiFormatReader(hints);
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } } },
        this.video().nativeElement,
        (result) => {
          if (result) {
            this.finish(result.getText());
          }
        },
      );
      if (this.closed) {
        controls.stop();
        return;
      }
      this.controls = controls;
      this.cameraState.set('scanning');
    } catch (error) {
      const name = (error as { name?: string })?.name;
      this.cameraState.set(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
    }
  }

  protected submitManual(): void {
    const code = this.manualCode().trim();
    if (code) {
      this.finish(code);
    }
  }

  private finish(code: string): void {
    if (this.closed) {
      return;
    }
    this.stopCamera();
    this.dialogRef.close(code);
  }

  private stopCamera(): void {
    this.closed = true;
    this.controls?.stop();
    this.controls = undefined;
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }
}
