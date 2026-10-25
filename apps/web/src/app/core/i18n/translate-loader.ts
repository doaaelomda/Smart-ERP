import { Injectable } from '@angular/core';
import { TranslateLoader, type TranslationObject } from '@ngx-translate/core';
import { from, map, type Observable } from 'rxjs';
import type { Language } from '@erp/shared';

/**
 * Loads translation files as lazy JS chunks (no HTTP), so it works the same in the
 * browser and during SSR/prerender.
 */
const loaders: Record<Language, () => Promise<{ default: TranslationObject }>> = {
  ar: () => import('../../../i18n/ar.json'),
  en: () => import('../../../i18n/en.json'),
};

@Injectable()
export class LazyTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<TranslationObject> {
    const loader = loaders[lang as Language] ?? loaders.ar;
    return from(loader()).pipe(map((module) => module.default));
  }
}
