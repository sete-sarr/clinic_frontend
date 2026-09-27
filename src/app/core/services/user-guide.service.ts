import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import { environment } from '../../../environments/environment';
import { parseApiError } from '../api/api-error';
import { triggerBlobDownload } from '../utils/file-download';

const USER_GUIDE_FILENAME = 'Guide-de-la-Clinique.pdf';

// Guide d'utilisation de la plateforme : servi par le backend (clinics/api/views.py
// UserGuideDownloadView, IsClinicAdmin) et non comme fichier statique public, pour que seul un
// administrateur de clinique connecté puisse le télécharger. Récupéré en blob car le JWT part dans
// l'en-tête Authorization — un simple <a href> ne l'enverrait pas.
@Injectable({ providedIn: 'root' })
export class UserGuideService {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);
  private readonly url = `${environment.apiBaseUrl}/clinics/user-guide/`;

  download(): void {
    this.http.get(this.url, { responseType: 'blob' }).subscribe({
      next: (blob) => triggerBlobDownload(blob, USER_GUIDE_FILENAME),
      error: (error) => {
        const apiError = parseApiError(error, "Impossible de télécharger le guide d'utilisation.");
        this.snackBar.open(apiError.message, 'Fermer', { duration: 6000 });
      },
    });
  }
}
