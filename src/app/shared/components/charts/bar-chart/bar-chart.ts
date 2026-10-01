import { Component, DestroyRef, ElementRef, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';

import { ChartSeries, ValueFormatter, niceTicks } from '../chart.model';

const MARGIN = { top: 12, right: 8, bottom: 26, left: 48 };
const MAX_BAR_WIDTH = 24;
const SEGMENT_GAP = 2; // espace couleur de surface entre segments empilés
const CORNER = 4; // bout de barre arrondi (base carrée)

interface Segment {
  key: string;
  color: string;
  path: string;
}

interface Column {
  index: number;
  x: number;
  bandX: number;
  topY: number;
  segments: Segment[];
}

// Histogramme (simple ou empilé) en SVG : barres fines à bout arrondi, grille discrète, infobulle au
// survol et au clavier (flèches), légende dès deux séries, vue tableau équivalente (accessibilité).
@Component({
  selector: 'app-bar-chart',
  imports: [MatButtonModule, MatIconModule, TranslocoPipe],
  templateUrl: './bar-chart.html',
  styleUrl: './bar-chart.css',
})
export class BarChart {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly categories = input.required<string[]>();
  // Libellés complets (infobulle, tableau) ; par défaut ceux de l'axe.
  readonly categoryTitles = input<string[] | undefined>(undefined);
  readonly series = input.required<ChartSeries[]>();
  readonly format = input<ValueFormatter>((value) => String(value));
  readonly axisFormat = input<ValueFormatter | undefined>(undefined);
  readonly labelEvery = input(1);
  readonly caption = input('');
  readonly plotHeight = input(180);

  protected readonly width = signal(0);
  protected readonly active = signal<number | null>(null);
  protected readonly showTable = signal(false);

  constructor() {
    // Largeur réelle du conteneur : le graphique se redessine à la taille de sa carte (responsive).
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(([entry]) => this.width.set(Math.floor(entry.contentRect.width)));
      observer.observe(this.host.nativeElement);
      inject(DestroyRef).onDestroy(() => observer.disconnect());
    }
  }

  protected readonly height = computed(() => this.plotHeight() + MARGIN.top + MARGIN.bottom);
  protected readonly margin = MARGIN;

  private readonly totals = computed(() =>
    this.categories().map((_, i) => this.series().reduce((sum, serie) => sum + (serie.values[i] ?? 0), 0)),
  );
  protected readonly isEmpty = computed(() => this.totals().every((total) => total === 0));
  protected readonly ticks = computed(() => niceTicks(Math.max(...this.totals(), 0)));
  private readonly top = computed(() => this.ticks()[this.ticks().length - 1]);

  protected y(value: number): number {
    return MARGIN.top + this.plotHeight() - (value / this.top()) * this.plotHeight();
  }

  private readonly band = computed(() => {
    const count = this.categories().length;
    return count ? Math.max(this.width() - MARGIN.left - MARGIN.right, 0) / count : 0;
  });
  protected readonly bandWidth = this.band;
  protected readonly barWidth = computed(() => Math.max(Math.min(MAX_BAR_WIDTH, this.band() * 0.6), 2));

  protected readonly columns = computed<Column[]>(() => {
    const band = this.band();
    const barWidth = this.barWidth();
    return this.categories().map((_, index) => {
      const bandX = MARGIN.left + band * index;
      const x = bandX + (band - barWidth) / 2;
      let base = this.y(0);
      const visible = this.series().filter((serie) => (serie.values[index] ?? 0) > 0);
      const segments = visible.map((serie, position) => {
        const height = (serie.values[index] / this.top()) * this.plotHeight();
        const bottom = position === 0 ? base : base - SEGMENT_GAP;
        const top = Math.min(base - height, bottom - 1);
        base = top;
        const isTop = position === visible.length - 1;
        return { key: serie.key, color: serie.color, path: barPath(x, top, barWidth, bottom - top, isTop) };
      });
      return { index, x: x + barWidth / 2, bandX, topY: base, segments };
    });
  });

  protected readonly xLabels = computed(() => {
    const every = Math.max(this.labelEvery(), 1);
    const last = this.categories().length - 1;
    return this.columns().filter((column) => column.index % every === 0 || column.index === last);
  });

  protected axisLabel(value: number): string {
    return (this.axisFormat() ?? this.format())(value);
  }

  protected titleFor(index: number): string {
    return this.categoryTitles()?.[index] ?? this.categories()[index];
  }

  protected totalFor(index: number): number {
    return this.totals()[index];
  }

  protected seriesTotal(serie: ChartSeries): number {
    return serie.values.reduce((sum, value) => sum + value, 0);
  }

  // Infobulle : au-dessus de la colonne, maintenue dans le graphique.
  protected readonly tooltipLeft = computed(() => {
    const index = this.active();
    if (index === null) {
      return 0;
    }
    const x = this.columns()[index]?.x ?? 0;
    return Math.min(Math.max(x, 90), Math.max(this.width() - 90, 90));
  });

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.categories().length;
    if (!count || (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft')) {
      return;
    }
    event.preventDefault();
    const current = this.active() ?? (event.key === 'ArrowRight' ? -1 : count);
    const next = event.key === 'ArrowRight' ? Math.min(current + 1, count - 1) : Math.max(current - 1, 0);
    this.active.set(next);
  }

  protected onFocus(): void {
    if (this.active() === null) {
      this.active.set(this.categories().length - 1);
    }
  }
}

// Barre à base carrée et bout arrondi (seulement pour le segment du haut).
function barPath(x: number, y: number, width: number, height: number, roundTop: boolean): string {
  const r = roundTop ? Math.min(CORNER, height, width / 2) : 0;
  const bottom = y + height;
  return [
    `M${x},${bottom}`,
    `L${x},${y + r}`,
    r ? `Q${x},${y} ${x + r},${y}` : '',
    `L${x + width - r},${y}`,
    r ? `Q${x + width},${y} ${x + width},${y + r}` : '',
    `L${x + width},${bottom}`,
    'Z',
  ].join(' ');
}
