import { inject, Pipe, type PipeTransform } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';

/** Date in the current language: "25 Oct 2026" / "٢٥ أكتوبر ٢٠٢٦". Impure to follow language changes. */
@Pipe({ name: 'localDate', pure: false })
export class LocalDatePipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(value: Date | string | null | undefined, withTime = false): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat(this.language.locale(), {
      dateStyle: 'medium',
      ...(withTime ? { timeStyle: 'short' } : {}),
    }).format(new Date(value));
  }
}
