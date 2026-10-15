import { Capacitor } from '@capacitor/core';
import { isTauri } from '@tauri-apps/api/core';

/** Onglet réservé pendant le clic, rempli quand l'adresse est connue (page de paiement…). */
export interface PendingPage {
  open(url: string): void;
  cancel(): void;
}

/**
 * Ouvre une page externe à côté de l'application, sans la quitter : nouvel onglet dans le navigateur,
 * navigateur du téléphone dans l'application mobile, navigateur par défaut dans l'application de
 * bureau. À appeler directement dans le gestionnaire de clic : dans un navigateur, l'onglet doit être
 * ouvert pendant le clic, sinon il est bloqué comme fenêtre surgissante (l'adresse arrive après un
 * appel au serveur). Si l'onglet est bloqué malgré tout, la page s'ouvre à la place de l'application.
 */
export function reserveExternalPage(): PendingPage {
  const tab = Capacitor.isNativePlatform() || isTauri() ? null : window.open('', '_blank');
  return {
    open(url: string) {
      if (isTauri()) {
        void import('@tauri-apps/plugin-opener').then(({ openUrl }) => openUrl(url));
      } else if (Capacitor.isNativePlatform()) {
        window.open(url, '_blank'); // adresse hors de l'application : ouverte dans le navigateur du téléphone
      } else if (tab && !tab.closed) {
        tab.location.href = url;
      } else {
        window.location.href = url;
      }
    },
    cancel() {
      tab?.close();
    },
  };
}
