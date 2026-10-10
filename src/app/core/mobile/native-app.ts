import { EnvironmentProviders, inject, provideAppInitializer } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';

// Application mobile (Capacitor, docs/mobile.md § Étape 2) : réglages natifs au démarrage. Sans effet
// sur le web et le bureau ; les plugins sont chargés en import() dynamique, comme ceux de Tauri dans
// core/utils/file-download.ts, pour ne rien ajouter au bundle de la version web.
export function provideNativeApp(): EnvironmentProviders {
  return provideAppInitializer(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    const dialog = inject(MatDialog);
    void initNativeApp(dialog).catch((error) => console.error(error));
  });
}

async function initNativeApp(dialog: MatDialog): Promise<void> {
  const [{ App }, { SplashScreen }] = await Promise.all([import('@capacitor/app'), import('@capacitor/splash-screen')]);

  // Affichage bord à bord (Android 15+) : l'en-tête, aux couleurs --sidebar-bg, passe sous la barre
  // d'état (marge env(safe-area-inset-top) dans les coquilles) ; icônes de la barre d'état en clair.
  await SystemBars.setStyle({ style: SystemBarsStyle.Dark });

  // Bouton retour Android : ferme d'abord la fenêtre ouverte, sinon revient à l'écran précédent, et
  // ne quitte l'application qu'au premier écran.
  await App.addListener('backButton', ({ canGoBack }) => {
    const openDialogs = dialog.openDialogs;
    if (openDialogs.length) {
      openDialogs[openDialogs.length - 1].close();
    } else if (canGoBack) {
      window.history.back();
    } else {
      void App.exitApp();
    }
  });

  await SplashScreen.hide();
}
