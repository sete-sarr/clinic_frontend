package com.procli.app;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // super.onCreate() d'abord : Capacitor y remplace le thème de l'écran de démarrage par
        // AppTheme.NoActionBar. Activer le bord à bord avant créerait la fenêtre avec le thème de
        // démarrage, et une barre de titre Android recouvrirait le haut de l'application.
        super.onCreate(savedInstanceState);
        // Bord à bord (Android 15+) recommandé par Capacitor 8 avec SystemBars.insetsHandling = "css" :
        // l'interface gère les zones de la barre d'état et de gestes (env(safe-area-inset-*)).
        EdgeToEdge.enable(this);
    }
}
