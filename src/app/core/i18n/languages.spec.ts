import { isAppLanguage, languageFromBrowser } from './languages';

describe('languageFromBrowser', () => {
  it('reconnaît le français quelle que soit la variante régionale', () => {
    expect(languageFromBrowser(['fr-SN', 'en-US'])).toBe('fr');
  });

  it("reconnaît l'anglais", () => {
    expect(languageFromBrowser(['en-GB'])).toBe('en');
  });

  it('prend la première langue supportée dans l’ordre de préférence', () => {
    expect(languageFromBrowser(['de-DE', 'fr-FR', 'en'])).toBe('fr');
  });

  it("retombe sur l'anglais pour une langue non supportée ou absente", () => {
    expect(languageFromBrowser(['es-ES', 'pt-BR'])).toBe('en');
    expect(languageFromBrowser([])).toBe('en');
  });
});

describe('isAppLanguage', () => {
  it('accepte uniquement fr et en', () => {
    expect(isAppLanguage('fr')).toBe(true);
    expect(isAppLanguage('en')).toBe(true);
    expect(isAppLanguage('de')).toBe(false);
    expect(isAppLanguage(null)).toBe(false);
  });
});
