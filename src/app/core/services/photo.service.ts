import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { translate } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { parseApiError } from '../api/api-error';

// Modification de photo choisie dans app-photo-picker : nouveau fichier, retrait, ou rien.
export type PhotoChange = File | 'remove' | null;

// Points d'accès photo (backend common/photos.py) : POST multipart pour ajouter ou remplacer,
// DELETE pour retirer ; la réponse contient la nouvelle URL signée.
export const PHOTO_URLS = {
  me: () => `${environment.apiBaseUrl}/accounts/me/photo/`,
  // Membre du personnel ou médecin (son compte utilisateur), géré par l'administrateur.
  staff: (userId: number) => `${environment.apiBaseUrl}/accounts/staff/${userId}/photo/`,
  patient: (patientId: number) => `${environment.apiBaseUrl}/patients/${patientId}/photo/`,
};

@Injectable({ providedIn: 'root' })
export class PhotoService {
  private readonly http = inject(HttpClient);

  // Applique `change` ; renvoie null en cas de succès (ou s'il n'y a rien à faire), sinon le
  // message d'erreur à afficher. `extra` : champs joints au fichier (consentement du patient).
  async apply(url: string, change: PhotoChange, extra: Record<string, string> = {}): Promise<string | null> {
    if (change === null) {
      return null;
    }
    try {
      if (change === 'remove') {
        await firstValueFrom(this.http.delete(url));
      } else {
        const body = new FormData();
        body.append('photo', change);
        Object.entries(extra).forEach(([key, value]) => body.append(key, value));
        await firstValueFrom(this.http.post(url, body));
      }
      return null;
    } catch (error) {
      return parseApiError(error, translate('photo.saveError')).message;
    }
  }
}
