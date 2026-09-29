import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@jsverse/transloco';

import { environment } from '../../../environments/environment';
import { parseApiError } from '../api/api-error';
import { triggerBlobDownload } from '../utils/file-download';

// Même correspondance que le backend (clinics/api/views.py USER_GUIDE_FILENAMES) : le guide est servi
// dans la langue d'affichage, transmise par l'en-tête Accept-Language (language.interceptor.ts).
const USER_GUIDE_FILENAMES: Record<string, string> = {
  fr: 'Guide-de-la-Clinique.pdf',
  en: 'Clinic-User-Guide.pdf',
};

// Guide d'utilisation de la plateforme : servi par le backend (clinics/api/views.py
// UserGuideDownloadView, IsClinicAdmin) et non comme fichier statique public, pour que seul un
// administrateur de clinique connecté puisse le télécharger. Récupéré en blob car le JWT part dans
// l'en-tête Authorization — un simple <a href> ne l'enverrait pas.
@Injectable({ providedIn: 'root' })
export class UserGuideService {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);
  private readonly transloco = inject(TranslocoService);
  private readonly url = `${environment.apiBaseUrl}/clinics/user-guide/`;

  download(): void {
    this.http.get(this.url, { responseType: 'blob' }).subscribe({
      next: (blob) =>
        triggerBlobDownload(
          blob,
          USER_GUIDE_FILENAMES[this.transloco.getActiveLang()] ?? USER_GUIDE_FILENAMES['fr'],
        ),
      error: (error) => {
        const apiError = parseApiError(error, this.transloco.translate('userGuide.downloadError'));
        this.snackBar.open(apiError.message, this.transloco.translate('userGuide.close'), { duration: 6000 });
      },
    });
  }
}
