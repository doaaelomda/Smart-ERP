import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TagModule } from 'primeng/tag';

type Severity = 'secondary' | 'info' | 'success' | 'warn' | 'danger' | 'contrast';

/** Colour of every document status in one place. */
const STATUS_SEVERITY: Record<string, Severity> = {
  draft: 'secondary',
  issued: 'info',
  sent: 'info',
  partially_paid: 'warn',
  partially_received: 'warn',
  paid: 'success',
  received: 'success',
  accepted: 'success',
  converted: 'contrast',
  rejected: 'danger',
  cancelled: 'danger',
  overdue: 'danger',
  expired: 'danger',
  late: 'danger',
  active: 'success',
  inactive: 'secondary',
  low: 'danger',
};

/** <app-status-pill status="partially_paid" /> → translated PrimeNG tag (`status.<value>`). */
@Component({
  selector: 'app-status-pill',
  imports: [TagModule, TranslatePipe],
  template: `<p-tag [value]="'status.' + status() | translate" [severity]="severity()" [rounded]="true" styleClass="whitespace-nowrap" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusPill {
  readonly status = input.required<string>();
  protected readonly severity = computed(() => STATUS_SEVERITY[this.status()] ?? 'secondary');
}
