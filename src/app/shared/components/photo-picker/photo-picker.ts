import { Component, computed, effect, input, model, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { PhotoChange } from '../../../core/services/photo.service';
import { Avatar, AvatarKind } from '../avatar/avatar';

// Mêmes limites que le backend (common/images.py) : contrôlées ici pour répondre sans attendre l'envoi.
const ACCEPTED_TYPES = ['image/png', 'image/jpeg'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024;

// Choix d'une photo de profil dans un formulaire : aperçu, ajout/remplacement, retrait. Le
// formulaire parent applique `change` après l'enregistrement de la fiche (PhotoService). Patient :
// `requireConsent` affiche la case de consentement, obligatoire pour enregistrer une nouvelle photo.
@Component({
  selector: 'app-photo-picker',
  imports: [Avatar, MatButtonModule, MatCheckboxModule, MatIconModule, TranslocoPipe],
  templateUrl: './photo-picker.html',
  styleUrl: './photo-picker.css',
})
export class PhotoPicker {
  readonly currentSrc = input<string | null | undefined>(null);
  readonly kind = input.required<AvatarKind>();
  readonly name = input('');
  readonly requireConsent = input(false);

  readonly change = model<PhotoChange>(null);
  readonly consent = model(false);

  protected readonly error = signal<string | null>(null);
  private readonly objectUrl = signal<string | null>(null);

  protected readonly previewSrc = computed(() => {
    const change = this.change();
    if (change === 'remove') {
      return null;
    }
    return change ? this.objectUrl() : this.currentSrc();
  });
  protected readonly hasPhoto = computed(() => !!this.previewSrc());
  protected readonly hasNewFile = computed(() => this.change() instanceof File);

  constructor() {
    // Aperçu du fichier choisi, libéré dès qu'il change ou que le composant disparaît.
    effect((onCleanup) => {
      const change = this.change();
      if (change instanceof File) {
        const url = URL.createObjectURL(change);
        this.objectUrl.set(url);
        onCleanup(() => URL.revokeObjectURL(url));
      } else {
        this.objectUrl.set(null);
      }
    });
  }

  protected onFileSelected(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0];
    inputElement.value = ''; // permet de choisir à nouveau le même fichier
    if (!file) {
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      this.error.set(translate('photo.invalidType'));
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      this.error.set(translate('photo.tooLarge'));
      return;
    }
    this.error.set(null);
    this.consent.set(false);
    this.change.set(file);
  }

  protected remove(): void {
    this.error.set(null);
    this.change.set(this.currentSrc() ? 'remove' : null);
  }
}
