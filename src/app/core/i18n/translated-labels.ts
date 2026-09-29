import { translate } from '@jsverse/transloco';

// Table de libellés (valeur d'énumération de l'API -> texte affiché) dont chaque libellé est traduit
// à la lecture : `LABELS[status]` et `Object.entries(LABELS)` s'utilisent comme une table ordinaire,
// dans la langue de l'interface. Clés : `${prefix}.${valeur}` (docs/i18n.md §3).
export function translatedLabels<K extends string>(prefix: string, values: readonly K[]): Record<K, string> {
  const labels = {} as Record<K, string>;
  for (const value of values) {
    Object.defineProperty(labels, value, {
      get: () => translate(`${prefix}.${value}`),
      enumerable: true,
    });
  }
  return labels;
}
