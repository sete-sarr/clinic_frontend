import { formatStock, unitsFor } from './pharmacy.model';

// Stock compté en unités de base, affiché en conditionnements + unités restantes.
describe('formatStock', () => {
  const box = { units_per_pack: 50, pack_unit: 'boîte', unit: 'comprimé' };

  it('affiche les boîtes entières puis les unités restantes', () => {
    expect(formatStock(box, 497)).toBe('9 × boîte + 47 × comprimé');
    expect(formatStock(box, 100)).toBe('2 × boîte');
    expect(formatStock(box, 3)).toBe('3 × comprimé');
    expect(formatStock(box, 0)).toBe('0');
  });

  it('garde le simple nombre pour un produit non conditionné', () => {
    expect(formatStock({ units_per_pack: 1, pack_unit: '', unit: 'flacon' }, 12)).toBe('12');
  });
});

describe('unitsFor', () => {
  it('convertit les conditionnements en unités de base', () => {
    expect(unitsFor({ units_per_pack: 50 }, 2, 'pack')).toBe(100);
    expect(unitsFor({ units_per_pack: 50 }, 3, 'unit')).toBe(3);
  });
});
