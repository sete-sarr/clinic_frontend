import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';

import { LanguageService } from '../../../../core/i18n/language.service';
import { DonutSegment, ValueFormatter } from '../chart.model';

const SIZE = 184;
const RADIUS = 74;
const STROKE = 16;
const GAP = 2; // espace couleur de surface entre segments (px le long de l'anneau)

interface Arc {
  segment: DonutSegment;
  path: string | null; // null : segment unique, cercle complet
  share: number;
}

// Anneau « part du tout » (peu de segments, design-system/charts.md) : légende avec valeurs et parts,
// lecture au centre au survol ou au clavier (focus sur une ligne de légende), vue tableau équivalente.
@Component({
  selector: 'app-donut-chart',
  imports: [MatButtonModule, MatIconModule, TranslocoPipe],
  templateUrl: './donut-chart.html',
  styleUrl: './donut-chart.css',
})
export class DonutChart {
  readonly segments = input.required<DonutSegment[]>();
  readonly format = input<ValueFormatter>((value) => String(value));
  readonly centerLabel = input('');
  readonly centerValue = input('');
  readonly caption = input('');

  protected readonly size = SIZE;
  protected readonly center = SIZE / 2;
  protected readonly radius = RADIUS;
  protected readonly stroke = STROKE;
  protected readonly active = signal<string | null>(null);
  protected readonly showTable = signal(false);

  protected readonly total = computed(() => this.segments().reduce((sum, segment) => sum + segment.value, 0));
  protected readonly isEmpty = computed(() => this.total() === 0);

  protected readonly arcs = computed<Arc[]>(() => {
    const total = this.total();
    const visible = this.segments().filter((segment) => segment.value > 0);
    if (!total) {
      return [];
    }
    if (visible.length === 1) {
      return [{ segment: visible[0], path: null, share: 1 }];
    }
    const gapAngle = GAP / RADIUS;
    let angle = -Math.PI / 2;
    return visible.map((segment) => {
      const sweep = (segment.value / total) * 2 * Math.PI;
      const start = angle + gapAngle / 2;
      const end = angle + Math.max(sweep - gapAngle / 2, gapAngle / 2 + 0.001);
      angle += sweep;
      return { segment, path: arcPath(this.center, RADIUS, start, end), share: segment.value / total };
    });
  });

  private readonly percent = new Intl.NumberFormat(inject(LanguageService).current(), {
    style: 'percent',
    maximumFractionDigits: 0,
  });

  protected readonly activeSegment = computed(() => this.segments().find((segment) => segment.key === this.active()) ?? null);

  protected share(segment: DonutSegment): string {
    const total = this.total();
    return this.percent.format(total ? segment.value / total : 0);
  }
}

function arcPath(center: number, radius: number, start: number, end: number): string {
  const point = (angle: number) => `${center + radius * Math.cos(angle)},${center + radius * Math.sin(angle)}`;
  const largeArc = end - start > Math.PI ? 1 : 0;
  return `M${point(start)} A${radius},${radius} 0 ${largeArc} 1 ${point(end)}`;
}
