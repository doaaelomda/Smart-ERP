import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { FilterTabs } from '../../shared/components/filter-tabs/filter-tabs';
import { formatMoney } from '@erp/shared';
import { AuthService } from '../../core/auth/auth.service';
import { HasPermission } from '../../core/auth/has-permission.directive';
import { LanguageService } from '../../core/i18n/language.service';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import {
  DEMO_ALERTS,
  DEMO_INVOICES,
  DEMO_KPI_BASE,
  DEMO_REVENUE_BY_MONTH,
  DEMO_TOP_PRODUCTS,
  type InvoiceStatus,
} from './dashboard.mock';

type Period = 'month' | 'quarter' | 'year';
const PERIOD_MONTHS: Record<Period, number> = { month: 1, quarter: 3, year: 12 };

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  paid: 'bg-success-soft text-success',
  issued: 'bg-info-soft text-info',
  partially_paid: 'bg-warning-soft text-warning',
  overdue: 'bg-danger-soft text-danger',
};

/** Dashboard layout with DEMO data until the Phase 5 dashboard API exists. */
@Component({
  selector: 'app-dashboard-page',
  imports: [ButtonModule, FilterTabs, RouterLink, TranslatePipe, TimeAgoPipe, HasPermission],
  templateUrl: './dashboard-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly language = inject(LanguageService);
  protected readonly auth = inject(AuthService);

  protected readonly period = signal<Period>('month');
  protected readonly periodTabs = (['month', 'quarter', 'year'] as Period[]).map((p) => ({ value: p, labelKey: `dashboard.period.${p}` }));

  protected readonly alerts = DEMO_ALERTS.map((a) => ({ ...a, at: new Date(Date.now() - a.minutes * 60_000) }));
  protected readonly invoices = DEMO_INVOICES;
  protected readonly topProducts = DEMO_TOP_PRODUCTS;
  protected readonly statusStyles = STATUS_STYLES;

  /** Revenue for the selected period vs the period before it. */
  protected readonly kpis = computed(() => {
    const months = PERIOD_MONTHS[this.period()];
    const data = DEMO_REVENUE_BY_MONTH;
    const sum = (from: number, to: number) => data.slice(from, to).reduce((a, b) => a + b, 0);
    const current = sum(data.length - months, data.length);
    const previous = months === 12 ? current / 1.18 : sum(data.length - months * 2, data.length - months);
    const revenueDelta = Math.round(((current - previous) / previous) * 1000) / 10;

    return [
      { key: 'revenue', icon: 'trending_up', tile: 'bg-info-soft text-info', value: current, money: true, delta: revenueDelta, goodWhenUp: true },
      { key: 'receivables', icon: 'account_balance_wallet', tile: 'bg-warning-soft text-warning', ...DEMO_KPI_BASE.receivables, money: true, goodWhenUp: false },
      { key: 'stockValue', icon: 'inventory_2', tile: 'bg-success-soft text-success', ...DEMO_KPI_BASE.stockValue, money: true, goodWhenUp: true },
      { key: 'overdue', icon: 'schedule', tile: 'bg-danger-soft text-danger', ...DEMO_KPI_BASE.overdue, money: false, goodWhenUp: false },
    ];
  });

  private readonly maxRevenue = Math.max(...DEMO_REVENUE_BY_MONTH);
  protected readonly revenueBars = DEMO_REVENUE_BY_MONTH.map((value, month) => ({
    month,
    value,
    height: Math.round((value / this.maxRevenue) * 100),
  }));
  /** Month labels for the last 12 months, localized (e.g. "Nov" / "نوفمبر"). */
  protected readonly monthLabels = computed(() => {
    const format = new Intl.DateTimeFormat(this.language.locale(), { month: 'short' });
    const now = new Date();
    return this.revenueBars.map((_, i) => format.format(new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)));
  });
  protected readonly highlightedFrom = computed(() => 12 - PERIOD_MONTHS[this.period()]);

  protected readonly firstName = computed(() => this.auth.user()?.name.split(/\s+/)[0] ?? '');
  private readonly currency = computed(() => this.auth.user()?.tenant.currency ?? 'EGP');

  protected money(minor: number, compact = false): string {
    const locale = this.language.locale();
    if (!compact) return formatMoney(minor, this.currency(), locale);
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency(),
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(minor / 100);
  }

  protected formatDelta(delta: number, isPercent: boolean): string {
    return `${delta > 0 ? '+' : ''}${delta}${isPercent ? '%' : ''}`;
  }
}
