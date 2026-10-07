import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { MoneyPipe } from '../../../core/utils/money';
import { RecordCardData } from './record-card.model';

// Carte mobile d'une ligne de liste : en-tête (pastille, titre, sous-titre, statut), informations
// sur deux colonnes, puis les actions projetées (le même modèle d'actions que la colonne du tableau).
@Component({
  selector: 'app-record-card',
  imports: [DatePipe, MatIconModule, MoneyPipe],
  templateUrl: './record-card.html',
  styleUrl: './record-card.css',
})
export class RecordCard {
  readonly card = input.required<RecordCardData>();
}
