import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PrimeNG } from 'primeng/config';
import { DEFAULT_LANGUAGE, isLanguage, LANGUAGE_DIRECTION, type Language } from '@erp/shared';
import { firstValueFrom } from 'rxjs';
import { STORAGE_KEYS } from '../config/app.constants';
import { PRIMENG_LOCALE } from './primeng-locale';

/**
 * Single source of truth for the current language and text direction.
 * Components bind `[dir]="language.direction()"` instead of hardcoding rtl/ltr.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);
  private readonly primeng = inject(PrimeNG);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _language = signal<Language>(DEFAULT_LANGUAGE);

  readonly language = this._language.asReadonly();
  readonly direction = computed(() => LANGUAGE_DIRECTION[this._language()]);
  readonly isRtl = computed(() => this.direction() === 'rtl');
  /** Locale used for Intl number/date/currency formatting. */
  readonly locale = computed(() => (this._language() === 'ar' ? 'ar-EG-u-nu-latn' : 'en-EG'));

  /** Called once on app start (provideAppInitializer). */
  init(): Promise<void> {
    this.translate.setFallbackLang(DEFAULT_LANGUAGE);
    return this.use(this.readStoredLanguage());
  }

  async use(language: Language): Promise<void> {
    await firstValueFrom(this.translate.use(language));
    this._language.set(language);
    this.primeng.setTranslation(PRIMENG_LOCALE[language]);

    const html = this.document.documentElement;
    html.lang = language;
    html.dir = LANGUAGE_DIRECTION[language];

    if (this.isBrowser) {
      try {
        localStorage.setItem(STORAGE_KEYS.language, language);
      } catch {
        /* storage unavailable (private mode) - ignore */
      }
    }
  }

  toggle(): Promise<void> {
    return this.use(this._language() === 'ar' ? 'en' : 'ar');
  }

  private readStoredLanguage(): Language {
    if (!this.isBrowser) return DEFAULT_LANGUAGE;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.language);
      return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
    } catch {
      return DEFAULT_LANGUAGE;
    }
  }
}
