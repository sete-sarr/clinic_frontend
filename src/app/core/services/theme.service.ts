import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

const THEME_KEY = 'clinic_theme_preference';
const ACCENT_KEY = 'clinic_accent_preference';

export type ThemePreference = 'light' | 'dark' | 'system';

// Three dedicated dark sidebar palettes (fixed hex values, not derived from --color-primary — see
// styles.scss :root[data-accent] blocks for the actual token values per palette).
export type AccentColor = 'ocean' | 'teal' | 'sky';

const DEFAULT_ACCENT: AccentColor = 'ocean';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly theme = signal<ThemePreference>(this.readInitial());
  readonly current = this.theme.asReadonly();

  private readonly accent = signal<AccentColor>(this.readInitialAccent());
  readonly currentAccent = this.accent.asReadonly();

  init(): void {
    this.apply(this.theme());
    this.applyAccent(this.accent());
  }

  setTheme(theme: ThemePreference): void {
    this.theme.set(theme);
    if (this.isBrowser) {
      localStorage.setItem(THEME_KEY, theme);
    }
    this.apply(theme);
  }

  // Per-user preference (like light/dark), not per-clinic — every staff member picks their own
  // sidebar/header accent independently of the clinic's branding logo/colors.
  setAccent(accent: AccentColor): void {
    this.accent.set(accent);
    if (this.isBrowser) {
      localStorage.setItem(ACCENT_KEY, accent);
    }
    this.applyAccent(accent);
  }

  // Resolves 'system' to the browser's actual current preference — needed wherever a caller
  // needs light/dark specifically (e.g. picking which logo variant to show), not the raw setting.
  effectiveTheme(): 'light' | 'dark' {
    const theme = this.theme();
    if (theme !== 'system') {
      return theme;
    }
    if (!this.isBrowser) {
      return 'light';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private readInitial(): ThemePreference {
    if (!this.isBrowser) {
      return 'system';
    }
    const stored = localStorage.getItem(THEME_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  }

  private readInitialAccent(): AccentColor {
    if (!this.isBrowser) {
      return DEFAULT_ACCENT;
    }
    const stored = localStorage.getItem(ACCENT_KEY);
    return stored === 'ocean' || stored === 'teal' || stored === 'sky' ? stored : DEFAULT_ACCENT;
  }

  private apply(theme: ThemePreference): void {
    if (!this.isBrowser) {
      return;
    }
    if (theme === 'system') {
      delete document.documentElement.dataset['theme'];
    } else {
      document.documentElement.dataset['theme'] = theme;
    }
  }

  private applyAccent(accent: AccentColor): void {
    if (!this.isBrowser) {
      return;
    }
    if (accent === DEFAULT_ACCENT) {
      delete document.documentElement.dataset['accent'];
    } else {
      document.documentElement.dataset['accent'] = accent;
    }
  }
}
