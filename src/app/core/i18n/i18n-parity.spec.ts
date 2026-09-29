import en from '../../i18n/en.json';
import fr from '../../i18n/fr.json';

// Garde-fou docs/i18n.md §3 : chaque texte existe dans les deux langues. Échoue si une clé manque
// d'un côté ou si une traduction est vide — un oubli se voit ici, pas chez un client.
function flatten(tree: unknown, prefix = ''): Map<string, unknown> {
  const entries = new Map<string, unknown>();
  if (tree && typeof tree === 'object') {
    for (const [key, value] of Object.entries(tree)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object') {
        flatten(value, path).forEach((v, k) => entries.set(k, v));
      } else {
        entries.set(path, value);
      }
    }
  }
  return entries;
}

describe('traductions fr/en', () => {
  const frKeys = flatten(fr);
  const enKeys = flatten(en);

  it('ont exactement les mêmes clés', () => {
    const missingInEn = [...frKeys.keys()].filter((key) => !enKeys.has(key));
    const missingInFr = [...enKeys.keys()].filter((key) => !frKeys.has(key));
    expect(missingInEn).toEqual([]);
    expect(missingInFr).toEqual([]);
  });

  it("n'ont aucune traduction vide", () => {
    const empty = [...frKeys, ...enKeys]
      .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });
});
