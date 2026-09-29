import { Pipe, PipeTransform, inject } from '@angular/core';

import { LanguageService } from '../i18n/language.service';

// Devises de facturation des patients (docs/i18n.md §8) : choisies par la clinique (Paramètres),
// mémorisées sur chaque facture. Table et règles reproduites À L'IDENTIQUE depuis
// backend/common/currency.py, pour que l'écran et les PDF affichent le même texte — toute
// modification se reporte des deux côtés, tests compris (money.spec.ts / test_currency.py).
// L'abonnement à la plateforme n'est pas concerné (toujours en FCFA).

type EnglishPosition = 'prefix' | 'prefix_space' | 'suffix';

export const CURRENCIES = {
  XOF: { symbol: 'F CFA', decimals: 0, english: 'suffix' },
  XAF: { symbol: 'FCFA', decimals: 0, english: 'suffix' },
  GNF: { symbol: 'FG', decimals: 0, english: 'suffix' },
  CDF: { symbol: 'FC', decimals: 2, english: 'suffix' },
  MAD: { symbol: 'DH', decimals: 2, english: 'suffix' },
  DZD: { symbol: 'DA', decimals: 2, english: 'suffix' },
  NGN: { symbol: '₦', decimals: 2, english: 'prefix' },
  GHS: { symbol: 'GH₵', decimals: 2, english: 'prefix' },
  KES: { symbol: 'KSh', decimals: 2, english: 'prefix_space' },
  EUR: { symbol: '€', decimals: 2, english: 'prefix' },
  USD: { symbol: '$', decimals: 2, english: 'prefix' },
  GBP: { symbol: '£', decimals: 2, english: 'prefix' },
  CAD: { symbol: 'CA$', decimals: 2, english: 'prefix' },
  CHF: { symbol: 'CHF', decimals: 2, english: 'prefix_space' },
} as const satisfies Record<string, { symbol: string; decimals: number; english: EnglishPosition }>;

export type CurrencyCode = keyof typeof CURRENCIES;
export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];
export const DEFAULT_CURRENCY: CurrencyCode = 'XOF';

const NARROW_NBSP = ' '; // séparateur de milliers français
const NBSP = ' '; // entre le montant et le symbole

export function currencySymbol(currency: string | null | undefined): string {
  return CURRENCIES[currency as CurrencyCode]?.symbol ?? currency ?? '';
}

// « 10 000 F CFA » / « 10,000 F CFA », « 1 250,50 € » / « €1,250.50 ». Une devise sans centimes
// s'affiche sans décimales, sauf si le montant en comporte (TVA calculée…) : on ne masque jamais
// une partie d'un montant enregistré.
export function formatMoney(
  amount: string | number | null | undefined,
  currency: string | null | undefined,
  language: string,
): string {
  if (amount === null || amount === undefined || amount === '' || !currency) {
    return '';
  }
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return String(amount);
  }
  const spec = CURRENCIES[currency as CurrencyCode] ?? { symbol: currency, decimals: 2, english: 'suffix' };
  const decimals = spec.decimals === 0 && !Number.isInteger(value) ? 2 : spec.decimals;
  const [integer, fraction] = Math.abs(value).toFixed(decimals).split('.');
  const sign = value < 0 ? '-' : '';

  if (language.startsWith('en')) {
    const number = sign + integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction ? `.${fraction}` : '');
    if (spec.english === 'prefix') {
      return `${spec.symbol}${number}`;
    }
    if (spec.english === 'prefix_space') {
      return `${spec.symbol}${NBSP}${number}`;
    }
    return `${number}${NBSP}${spec.symbol}`;
  }
  const number = sign + integer.replace(/\B(?=(\d{3})+(?!\d))/g, NARROW_NBSP) + (fraction ? `,${fraction}` : '');
  return `${number}${NBSP}${spec.symbol}`;
}

// {{ invoice.total_amount | money: invoice.currency }} — la langue est fixée au démarrage
// (un changement recharge la page), d'où un pipe pur.
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  private readonly language = inject(LanguageService).current();

  transform(amount: string | number | null | undefined, currency: string | null | undefined): string {
    return formatMoney(amount, currency, this.language);
  }
}
