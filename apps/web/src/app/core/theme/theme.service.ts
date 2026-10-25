import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, DestroyRef, effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { STORAGE_KEYS } from '../config/app.constants';

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Light / dark / system theme. Applies the `dark` class on <html>, which switches
 * Material tokens (via color-scheme) and the app's CSS variables together.
 * index.html applies the saved theme before Angular boots to avoid a flash.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _mode = signal<ThemeMode>(this.readStoredMode());
  private readonly systemPrefersDark = signal(false);

  readonly mode = this._mode.asReadonly();
  readonly isDark = computed(() =>
    this._mode() === 'system' ? this.systemPrefersDark() : this._mode() === 'dark',
  );

  constructor() {
    if (this.isBrowser) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      this.systemPrefersDark.set(media.matches);
      const onChange = (e: MediaQueryListEvent) => this.systemPrefersDark.set(e.matches);
      media.addEventListener('change', onChange);
      inject(DestroyRef).onDestroy(() => media.removeEventListener('change', onChange));
    }

    effect(() => {
      this.document.documentElement.classList.toggle('dark', this.isDark());
    });
  }

  setMode(mode: ThemeMode): void {
    this._mode.set(mode);
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(STORAGE_KEYS.theme, mode);
    } catch {
      /* storage unavailable */
    }
  }

  toggle(): void {
    this.setMode(this.isDark() ? 'light' : 'dark');
  }

  private readStoredMode(): ThemeMode {
    if (!this.isBrowser) return 'system';
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.theme);
      return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    } catch {
      return 'system';
    }
  }
}
