import { translate } from '@jsverse/transloco';

import { AvatarKind } from '../avatar/avatar';

// Carte d'une ligne de liste sur mobile (design-system/cards.md) : chaque liste décrit ses cartes avec
// ces données ; la mise en forme est entièrement portée par app-record-card.

export type CardTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface CardField {
  label: string;
  value: string | number | null | undefined;
  // Mise en forme faite par la carte : format du pipe `date` (ex. 'mediumDate', 'short') ou devise
  // d'un montant (pipe `money`).
  date?: string;
  currency?: string;
}

export interface RecordCardData {
  title: string;
  subtitle?: string;
  // Pastille : photo (personnes ayant une photo de profil, avec image par défaut), sinon initiales
  // (personnes) ou icône Material (documents, objets).
  photo?: { src: string | null | undefined; kind: AvatarKind };
  initials?: string;
  icon?: string;
  status?: { label: string; tone: CardTone };
  fields: CardField[];
  // Enregistrement inactif ou archivé : carte atténuée.
  muted?: boolean;
}

// Couleur d'un statut, quelle que soit l'entité (même logique que les puces de statut des tableaux).
const STATUS_TONES: Record<string, CardTone> = {
  // Rendez-vous
  pending: 'warning',
  confirmed: 'success',
  completed: 'info',
  cancelled: 'error',
  no_show: 'error',
  // Consultations, prescriptions, factures, paiements
  draft: 'neutral',
  validated: 'success',
  issued: 'info',
  pending_payment: 'warning',
  paid: 'success',
  refunded: 'neutral',
  // Comptes, départements, stock
  active: 'success',
  inactive: 'neutral',
  archived: 'neutral',
  ok: 'success',
  low: 'warning',
  over: 'info',
};

export function statusTone(status: string): CardTone {
  return STATUS_TONES[status] ?? 'neutral';
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

// Statut « Actif / Inactif » des comptes (médecins, personnel, patients).
export function activeStatus(isActive: boolean): { label: string; tone: CardTone } {
  return isActive
    ? { label: translate('common.active'), tone: 'success' }
    : { label: translate('common.inactive'), tone: 'neutral' };
}
