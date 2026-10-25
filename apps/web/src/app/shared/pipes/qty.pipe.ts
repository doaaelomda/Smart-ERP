import { inject, Pipe, type PipeTransform } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';

/** Quantity with up to 3 decimals in the current locale. */
@Pipe({ name: 'qty', pure: false })
export class QtyPipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat(this.language.locale(), { maximumFractionDigits: 3 }).format(value);
  }
}
