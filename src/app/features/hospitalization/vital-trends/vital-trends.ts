import { formatDate } from '@angular/common';
import { Component, LOCALE_ID, computed, inject, input } from '@angular/core';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { LineChart, LineSeries } from '../../../shared/components/charts/line-chart/line-chart';
import { VitalSign } from '../hospitalization.model';
import { VITAL_FIELDS } from '../stay-dialogs/vital-sign-dialog';

type VitalKey = (typeof VITAL_FIELDS)[number]['key'];

// Un graphique par constante (petits multiples) : chaque mesure a sa propre échelle, jamais deux
// échelles sur un même graphique. Seule la tension réunit systolique et diastolique (même unité).
const GROUPS: { id: string; keys: VitalKey[] }[] = [
  { id: 'temperature', keys: ['temperature'] },
  { id: 'pulse', keys: ['pulse'] },
  { id: 'bloodPressure', keys: ['systolic', 'diastolic'] },
  { id: 'oxygen_saturation', keys: ['oxygen_saturation'] },
  { id: 'respiratory_rate', keys: ['respiratory_rate'] },
  { id: 'weight', keys: ['weight'] },
  { id: 'pain', keys: ['pain'] },
];

// Couleurs des graphiques (styles.scss, palette validée en clair et en sombre) ; la seconde série
// porte aussi un marqueur carré et un libellé direct (codage secondaire, jamais la couleur seule).
const SERIES_STYLE = [
  { color: 'var(--chart-blue)', shape: 'circle' as const },
  { color: 'var(--chart-teal)', shape: 'square' as const },
];

@Component({
  selector: 'app-vital-trends',
  imports: [LineChart, TranslocoPipe],
  templateUrl: './vital-trends.html',
  styleUrl: './vital-trends.css',
})
export class VitalTrends {
  private readonly locale = inject(LOCALE_ID);

  readonly vitals = input.required<VitalSign[]>();

  private readonly chronological = computed(() =>
    [...this.vitals()].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()),
  );
  protected readonly times = computed(() => this.chronological().map((vital) => vital.recorded_at));

  protected readonly charts = computed(() =>
    GROUPS.map((group) => {
      const series: LineSeries[] = group.keys.map((key, position) => ({
        key,
        label: translate(`hospitalization.vitals.${key}`),
        shortLabel: translate(`hospitalization.vitalsShort.${key}`),
        ...SERIES_STYLE[position],
        values: this.chronological().map((vital) => {
          const value = vital[key as keyof VitalSign];
          return value === null || value === undefined ? null : Number(value);
        }),
      }));
      const unit = VITAL_FIELDS.find((field) => field.key === group.keys[0])!.unit;
      return { id: group.id, unit, series, hasData: series.some((serie) => serie.values.some((value) => value !== null)) };
    }).filter((chart) => chart.hasData),
  );

  protected readonly formatTime = (time: string) => formatDate(time, 'd MMM HH:mm', this.locale);
  protected readonly formatValue = (value: number) =>
    new Intl.NumberFormat(this.locale, { maximumFractionDigits: 1 }).format(value);
}
