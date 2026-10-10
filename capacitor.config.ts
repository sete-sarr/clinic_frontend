import type { CapacitorConfig } from '@capacitor/cli';

// Application mobile proCli (docs/mobile.md § Étape 2) : même frontend que le web et le bureau, build
// `npm run build:mobile` (configuration production,mobile) copié dans android/ par `npx cap sync`.
// Identifiant définitif (décision du 2026-10-10) : ne plus le changer une fois l'application diffusée.
const config: CapacitorConfig = {
  appId: 'com.procli.app',
  appName: 'proCli',
  webDir: 'dist/frontend/browser',
  android: {
    // Diffusion directe de l'APK (pas de Google Play) : rien n'est servi en clair, l'API est en HTTPS.
    allowMixedContent: false,
  },
  plugins: {
    // Bord à bord (Android 15+) : la webview occupe tout l'écran (viewport-fit=cover dans index.html) et
    // les zones de la barre d'état / de gestes sont exposées par env(safe-area-inset-*) et
    // --safe-area-inset-* ; en-tête, menu et barre du bas les réservent (styles des coquilles).
    SystemBars: {
      insetsHandling: 'css',
      style: 'DARK',
      initialViewportFitValueHint: 'cover',
    },
    SplashScreen: {
      launchShowDuration: 1500,
      // Couleur --sidebar-bg (styles.scss).
      backgroundColor: '#0f3d5e',
      showSpinner: false,
    },
  },
};

export default config;
