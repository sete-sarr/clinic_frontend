import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';

// Onglet de la barre du bas : une entrée de menu existante (même route, même libellé, même icône que
// le menu latéral) ; `badge` = compteur affiché sur l'icône (notifications non lues).
export interface BottomNavTab {
  labelKey: string;
  icon: string;
  route: string;
  badge?: number;
}

// Libellés courts des onglets (bottomNav.short.*), pour tenir à 5 onglets sur 360 px ; à défaut, le
// libellé du menu latéral (labelKey).
const SHORT_LABEL_KEYS: Record<string, string> = {
  '/dashboard': 'bottomNav.short.dashboard',
  '/appointments': 'bottomNav.short.appointments',
  '/consultations': 'bottomNav.short.consultations',
  '/billing': 'bottomNav.short.invoices',
  '/hospitalization/stays': 'bottomNav.short.stays',
  '/portal/appointments': 'bottomNav.short.appointments',
  '/portal/prescriptions': 'bottomNav.short.prescriptions',
  '/portal/lab-results': 'bottomNav.short.results',
  '/portal/invoices': 'bottomNav.short.invoices',
};

// Barre de navigation fixée en bas sur téléphone, site web compris (docs/mobile.md § Étape 1) :
// 4 onglets au plus, choisis par la coquille selon le rôle, puis « Plus », qui ouvre le menu latéral
// complet. Affichée par Shell et PortalShell seulement quand isHandset() est vrai.
@Component({
  selector: 'app-bottom-nav',
  imports: [MatIconModule, RouterLink, RouterLinkActive, TranslocoPipe],
  template: `
    <nav class="bottom-nav" [attr.aria-label]="'bottomNav.label' | transloco">
      @for (tab of tabs(); track tab.route) {
        <a class="tab" [routerLink]="tab.route" routerLinkActive="active" #rla="routerLinkActive" [attr.aria-current]="rla.isActive ? 'page' : null">
          <span class="tab-icon">
            <mat-icon aria-hidden="true">{{ tab.icon }}</mat-icon>
            @if (tab.badge) {
              <span class="tab-badge" [attr.aria-label]="'bottomNav.unread' | transloco: { count: tab.badge }">
                {{ tab.badge > 99 ? '99+' : tab.badge }}
              </span>
            }
          </span>
          <span class="tab-label">{{ labelKeyOf(tab) | transloco }}</span>
        </a>
      }
      <button type="button" class="tab" (click)="more.emit()">
        <span class="tab-icon"><mat-icon aria-hidden="true">menu</mat-icon></span>
        <span class="tab-label">{{ 'bottomNav.more' | transloco }}</span>
      </button>
    </nav>
  `,
  styleUrl: './bottom-nav.css',
})
export class BottomNav {
  readonly tabs = input.required<BottomNavTab[]>();
  readonly more = output<void>();

  protected labelKeyOf(tab: BottomNavTab): string {
    return SHORT_LABEL_KEYS[tab.route] ?? tab.labelKey;
  }
}
