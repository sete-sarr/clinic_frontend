// Graphiques du tableau de bord (design-system/charts.md). Couleurs : tokens --chart-* de styles.scss,
// palette validée (séparation daltonisme, contraste clair et sombre) — ne jamais en introduire d'autres.

// Une série : `values[i]` correspond à la catégorie i. `color` : variable CSS, ex. 'var(--chart-blue)'.
export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

export interface DonutSegment {
  key: string;
  label: string;
  color: string;
  value: number;
  // Précision affichée dans la légende et l'infobulle (ex. un montant).
  detail?: string;
}

export type ValueFormatter = (value: number) => string;

// Pas « rond » (1, 2, 2,5, 5 × 10ⁿ) le plus proche de `rough` par excès.
function niceStep(rough: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  return [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= rough) ?? 10 * magnitude;
}

// Graduations « rondes » couvrant [min, max] SANS partir de zéro : pour des valeurs qui varient
// dans une plage étroite (constantes : 36,5–39 °C), où une échelle depuis zéro écraserait la courbe.
export function niceRangeTicks(min: number, max: number, targetCount = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [0, 1];
  }
  const span = max - min || Math.max(Math.abs(max) * 0.1, 1);
  const step = niceStep(span / targetCount);
  const start = Math.floor((min - (max === min ? span / 2 : 0)) / step) * step;
  const end = Math.ceil((max + (max === min ? span / 2 : 0)) / step) * step;
  const ticks: number[] = [];
  for (let tick = start; tick <= end + step / 2; tick += step) {
    ticks.push(Math.round(tick * 1e6) / 1e6);
  }
  return ticks.length > 1 ? ticks : [start, start + step];
}

// Graduations « rondes » (0, 5, 10, 15… / 0, 50 000, 100 000…) couvrant `max`.
export function niceTicks(max: number, targetCount = 4): number[] {
  if (max <= 0) {
    return [0, 1];
  }
  const rough = max / targetCount;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= rough) ?? 10 * magnitude;
  const ticks: number[] = [];
  for (let tick = 0; tick < max + step; tick += step) {
    ticks.push(Math.round(tick * 1e6) / 1e6);
    if (tick >= max) {
      break;
    }
  }
  return ticks;
}
