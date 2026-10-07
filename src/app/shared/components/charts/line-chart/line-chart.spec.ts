import { TestBed } from '@angular/core/testing';

import { niceRangeTicks } from '../chart.model';
import { LineChart } from './line-chart';

describe('niceRangeTicks', () => {
  it('couvre la plage sans partir de zéro', () => {
    const ticks = niceRangeTicks(36.6, 39.2);
    expect(ticks[0]).toBeGreaterThan(30);
    expect(ticks[0]).toBeLessThanOrEqual(36.6);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(39.2);
  });

  it('élargit une plage réduite à une seule valeur', () => {
    const ticks = niceRangeTicks(96, 96);
    expect(ticks[0]).toBeLessThan(96);
    expect(ticks[ticks.length - 1]).toBeGreaterThan(96);
  });
});

// Courbe : un tracé et un marqueur par valeur mesurée ; une valeur manquante (null) n'est pas
// tracée ; libellés directs dès deux séries, absents pour une seule.
describe('LineChart', () => {
  function render(series: { key: string; values: (number | null)[] }[]) {
    const fixture = TestBed.createComponent(LineChart);
    fixture.componentRef.setInput('times', ['2026-10-06T08:00:00Z', '2026-10-06T20:00:00Z', '2026-10-07T08:00:00Z']);
    fixture.componentRef.setInput(
      'series',
      series.map((serie, i) => ({ ...serie, label: serie.key, color: 'var(--chart-blue)', shape: i ? 'square' : 'circle' })),
    );
    (fixture.componentInstance as unknown as { width: { set(v: number): void } }).width.set(400);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('trace une série en ignorant les mesures absentes', () => {
    const element = render([{ key: 'temperature', values: [38.9, null, 37.6] }]);
    expect(element.querySelectorAll('path.series-line').length).toBe(1);
    expect(element.querySelectorAll('circle.marker').length).toBe(2);
    expect(element.querySelectorAll('.direct-label').length).toBe(0);
  });

  it('distingue deux séries par la forme du marqueur et un libellé direct', () => {
    const element = render([
      { key: 'systolic', values: [125, 130, 120] },
      { key: 'diastolic', values: [80, 85, 78] },
    ]);
    expect(element.querySelectorAll('circle.marker').length).toBe(3);
    expect(element.querySelectorAll('rect.marker').length).toBe(3);
    expect(element.querySelectorAll('.direct-label').length).toBe(2);
  });
});
