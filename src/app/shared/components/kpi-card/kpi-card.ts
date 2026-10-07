import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Couleur de la carte : tokens du design system (design-system/colors.md), toujours accompagnée de
// l'icône et du libellé (jamais la couleur seule).
export type KpiTone = 'primary' | 'accent' | 'secondary' | 'warning' | 'success' | 'info' | 'error' | 'neutral';

// Carte indicateur (tableau de bord, occupation des lits…) : pastille ronde avec icône, grand
// chiffre, libellé ; fond légèrement teinté et liseré gauche à la couleur de l'indicateur.
@Component({
  selector: 'app-kpi-card',
  imports: [MatCardModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.css',
})
export class KpiCard {
  readonly icon = input.required<string>();
  readonly label = input.required<string>();
  readonly value = input<string | number | null>(null);
  readonly tone = input<KpiTone>('primary');
  readonly loading = input(false);
}
