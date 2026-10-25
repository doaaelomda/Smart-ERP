import { inject, Pipe, type PipeTransform } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

/** "5 minutes ago" / "منذ ٥ دقائق" in the current language. Impure so it follows language changes. */
@Pipe({ name: 'timeAgo', pure: false })
export class TimeAgoPipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(date: Date | string): string {
    const seconds = Math.round((new Date(date).getTime() - Date.now()) / 1000);
    const format = new Intl.RelativeTimeFormat(this.language.locale(), { numeric: 'auto' });
    for (const [unit, size] of UNITS) {
      if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
    }
    return format.format(0, 'minute');
  }
}
