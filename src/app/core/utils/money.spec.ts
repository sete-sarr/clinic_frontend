import { formatMoney } from './money';

// Mêmes cas que backend/common/tests/test_currency.py : l'écran et les PDF doivent afficher le
// même texte pour un même montant.
const NNBSP = ' ';
const NBSP = ' ';

describe('formatMoney', () => {
  it('formate comme le backend, en français et en anglais', () => {
    const cases: [string | number, string, string, string][] = [
      ['10000.00', 'XOF', 'fr', `10${NNBSP}000${NBSP}F CFA`],
      ['10000.00', 'XOF', 'en', `10,000${NBSP}F CFA`],
      ['180.90', 'XOF', 'fr', `180,90${NBSP}F CFA`],
      ['1250.5', 'EUR', 'fr', `1${NNBSP}250,50${NBSP}€`],
      ['1250.5', 'EUR', 'en', '€1,250.50'],
      ['99', 'USD', 'en', '$99.00'],
      ['1234567.891', 'CHF', 'en', `CHF${NBSP}1,234,567.89`],
      [0, 'GNF', 'fr', `0${NBSP}FG`],
    ];
    for (const [amount, currency, language, expected] of cases) {
      expect(formatMoney(amount, currency, language)).toBe(expected);
    }
  });

  it('renvoie une chaîne vide sans montant ou sans devise', () => {
    expect(formatMoney(null, 'EUR', 'fr')).toBe('');
    expect(formatMoney('12', null, 'fr')).toBe('');
  });
});
