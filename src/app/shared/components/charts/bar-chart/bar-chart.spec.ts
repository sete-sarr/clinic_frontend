import { TestBed } from '@angular/core/testing';

import { translocoTesting } from '../../../../core/i18n/transloco-testing';
import { niceTicks } from '../chart.model';
import { BarChart } from './bar-chart';

describe('BarChart', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BarChart, translocoTesting('fr')] });
  });

  it('la vue tableau reprend chaque valeur de chaque catégorie', async () => {
    const fixture = TestBed.createComponent(BarChart);
    fixture.componentRef.setInput('categories', ['Mai', 'Juin']);
    fixture.componentRef.setInput('categoryTitles', ['Mai 2026', 'Juin 2026']);
    fixture.componentRef.setInput('series', [
      { key: 'a', label: 'Honorés', color: 'var(--chart-blue)', values: [3, 5] },
      { key: 'b', label: 'Absences', color: 'var(--chart-amber)', values: [1, 0] },
    ]);
    await fixture.whenStable();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.view-toggle')!.click();
    await fixture.whenStable();

    const rows = [...(fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')].map((row) =>
      [...row.querySelectorAll('th, td')].map((cell) => cell.textContent!.trim()),
    );
    expect(rows).toEqual([
      ['Mai 2026', '3', '1', '4'],
      ['Juin 2026', '5', '0', '5'],
    ]);
  });

  it('affiche un message quand toutes les valeurs sont nulles', async () => {
    const fixture = TestBed.createComponent(BarChart);
    fixture.componentRef.setInput('categories', ['Mai']);
    fixture.componentRef.setInput('series', [{ key: 'a', label: 'A', color: 'var(--chart-blue)', values: [0] }]);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('.chart-empty')).toBeTruthy();
  });
});

describe('niceTicks', () => {
  it('produit des graduations rondes qui couvrent le maximum', () => {
    expect(niceTicks(7)).toEqual([0, 2, 4, 6, 8]);
    expect(niceTicks(287500)).toEqual([0, 100000, 200000, 300000]);
    expect(niceTicks(0)).toEqual([0, 1]);
  });
});
