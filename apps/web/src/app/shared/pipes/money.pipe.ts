import { inject, Pipe, type PipeTransform } from '@angular/core';
import { formatMoney } from '@erp/shared';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/i18n/language.service';

/** Formats minor units in the tenant currency and current locale: 125000 -> "EGP 1,250.00". Impure to follow language changes. */
@Pipe({ name: 'money', pure: false })
export class MoneyPipe implements PipeTransform {
  private readonly auth = inject(AuthService);
  private readonly language = inject(LanguageService);

  transform(minor: number | null | undefined, currency?: string): string {
    if (minor === null || minor === undefined) return '—';
    return formatMoney(minor, currency ?? this.auth.user()?.tenant.currency ?? 'EGP', this.language.locale());
  }
}
