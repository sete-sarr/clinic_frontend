import { Component, DestroyRef, ElementRef, computed, inject, input, signal } from '@angular/core';

import { ValueFormatter, niceRangeTicks } from '../chart.model';

const MARGIN = { top: 12, right: 44, bottom: 24, left: 44 };
const MARKER = 4; // rayon : marqueurs de 8 px
const SNAP_DISTANCE = 40; // px : au-delà, le survol ne désigne aucun point

// Une série : `values[i]` correspond à `times[i]` ; null = non mesuré à ce moment-là.
// `shape` : codage secondaire de la série (jamais la couleur seule).
export interface LineSeries {
  key: string;
  label: string;
  shortLabel?: string;
  color: string;
  shape?: 'circle' | 'square';
  values: (number | null)[];
}

interface PlotPoint {
  index: number;
  x: number;
  y: number;
}

// Courbe d'évolution en SVG (design-system/charts.md) : une seule échelle verticale, ajustée aux
// valeurs (jamais forcée à zéro) ; abscisse proportionnelle au temps (mesures irrégulières) ;
// traits de 2 px, marqueurs de 8 px cerclés de la couleur de surface ; libellés directs en bout de
// courbe dès deux séries ; réticule et infobulle au survol et au clavier (flèches).
@Component({
  selector: 'app-line-chart',
  templateUrl: './line-chart.html',
  styleUrl: './line-chart.css',
})
export class LineChart {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly times = input.required<string[]>();
  readonly series = input.required<LineSeries[]>();
  readonly format = input<ValueFormatter>((value) => String(value));
  readonly timeFormat = input<(time: string) => string>((time) => time);
  readonly caption = input('');
  readonly plotHeight = input(120);

  protected readonly width = signal(0);
  protected readonly active = signal<number | null>(null);
  protected readonly margin = MARGIN;

  constructor() {
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(([entry]) => this.width.set(Math.floor(entry.contentRect.width)));
      observer.observe(this.host.nativeElement);
      inject(DestroyRef).onDestroy(() => observer.disconnect());
    }
  }

  protected readonly height = computed(() => this.plotHeight() + MARGIN.top + MARGIN.bottom);

  private readonly stamps = computed(() => this.times().map((time) => new Date(time).getTime()));
  private readonly values = computed(() =>
    this.series().flatMap((serie) => serie.values.filter((value): value is number => value !== null)),
  );
  protected readonly isEmpty = computed(() => this.values().length === 0);
  protected readonly ticks = computed(() => niceRangeTicks(Math.min(...this.values()), Math.max(...this.values())));

  protected y(value: number): number {
    const ticks = this.ticks();
    const low = ticks[0];
    const high = ticks[ticks.length - 1];
    return MARGIN.top + this.plotHeight() - ((value - low) / (high - low || 1)) * this.plotHeight();
  }

  private x(index: number): number {
    const stamps = this.stamps();
    const first = Math.min(...stamps);
    const last = Math.max(...stamps);
    const plotWidth = Math.max(this.width() - MARGIN.left - MARGIN.right, 0);
    return last === first ? MARGIN.left + plotWidth / 2 : MARGIN.left + ((stamps[index] - first) / (last - first)) * plotWidth;
  }

  protected readonly xs = computed(() => this.times().map((_, index) => this.x(index)));

  protected readonly plotted = computed(() =>
    this.series().map((serie) => {
      const points: PlotPoint[] = serie.values.flatMap((value, index) =>
        value === null ? [] : [{ index, x: this.xs()[index], y: this.y(value) }],
      );
      const path = points.map((point, i) => `${i ? 'L' : 'M'}${point.x},${point.y}`).join(' ');
      return { serie, points, path, last: points[points.length - 1] };
    }),
  );

  // Graduations de l'axe des temps : première et dernière mesure (plus le milieu si la place le permet).
  protected readonly timeTicks = computed(() => {
    const count = this.times().length;
    if (!count) {
      return [];
    }
    const indexes = this.width() > 420 && count > 2 ? [0, Math.floor((count - 1) / 2), count - 1] : [0, count - 1];
    return [...new Set(indexes)].map((index) => ({
      index,
      x: this.xs()[index],
      anchor: index === 0 ? 'start' : index === count - 1 ? 'end' : 'middle',
    }));
  });

  protected readonly directLabels = computed(() => this.series().length > 1);

  protected readonly tooltipLeft = computed(() => {
    const index = this.active();
    return index === null ? 0 : Math.min(Math.max(this.xs()[index], 80), Math.max(this.width() - 80, 80));
  });

  protected valueAt(serie: LineSeries, index: number): string {
    const value = serie.values[index];
    return value === null ? '—' : this.format()(value);
  }

  protected onPointerMove(event: PointerEvent): void {
    const svg = event.currentTarget as SVGElement;
    const offsetX = event.clientX - svg.getBoundingClientRect().left;
    let nearest: number | null = null;
    let distance = SNAP_DISTANCE;
    this.xs().forEach((x, index) => {
      if (Math.abs(x - offsetX) < distance) {
        distance = Math.abs(x - offsetX);
        nearest = index;
      }
    });
    this.active.set(nearest);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.times().length;
    if (!count || (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft')) {
      return;
    }
    event.preventDefault();
    const current = this.active() ?? (event.key === 'ArrowRight' ? -1 : count);
    this.active.set(event.key === 'ArrowRight' ? Math.min(current + 1, count - 1) : Math.max(current - 1, 0));
  }

  protected onFocus(): void {
    if (this.active() === null) {
      this.active.set(this.times().length - 1);
    }
  }
}
