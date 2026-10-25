import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, type OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ActionMenu } from '../../../shared/components/action-menu/action-menu';
import { ButtonModule } from 'primeng/button';
import type { ApiError, Invoice, Payment } from '@erp/shared';
import { filter, finalize, type Observable, switchMap } from 'rxjs';
import { errorTranslationKey } from '../../../core/http/api-error';
import { DialogService } from '../../../core/ui/dialog.service';
import { ToastService } from '../../../core/ui/toast.service';
import { ErrorBanner } from '../../../shared/components/error-banner/error-banner';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Skeleton } from '../../../shared/components/skeleton/skeleton';
import { StatusPill } from '../../../shared/components/status-pill/status-pill';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { type DocumentMetaItem, DocumentView } from '../../documents/document-view/document-view';
import { invoiceDisplayStatus } from '../document-status';
import { InvoiceService } from '../invoice.service';
import { PaymentDialog, type PaymentDialogData } from '../payments/payment-dialog';
import { PaymentService } from '../payment.service';

@Component({
  selector: 'app-invoice-details-page',
  imports: [ActionMenu, ButtonModule, 
    RouterLink,
    TranslatePipe,
    ErrorBanner,
    PageHeader,
    Skeleton,
    StatusPill,
    LocalDatePipe,
    MoneyPipe,
    DocumentView,
  ],
  templateUrl: './invoice-details-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceDetailsPage implements OnInit {
  readonly id = input.required<string>();

  private readonly invoiceService = inject(InvoiceService);
  private readonly paymentService = inject(PaymentService);
  private readonly dialogs = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly invoice = signal<Invoice | null>(null);
  protected readonly payments = signal<Payment[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Shortage message after a failed issue: "Paper A4 (available 2)". */
  protected readonly stockError = signal<string | null>(null);

  protected readonly status = computed(() => {
    const inv = this.invoice();
    return inv ? invoiceDisplayStatus(inv) : 'draft';
  });

  protected readonly meta = computed<DocumentMetaItem[]>(() => {
    const inv = this.invoice();
    if (!inv) return [];
    return [
      { labelKey: 'invoices.fields.issueDate', value: inv.issueDate, type: 'date' },
      { labelKey: 'documents.fields.dueDate', value: inv.dueDate, type: 'date', danger: this.status() === 'overdue' },
      { labelKey: 'documents.fields.warehouse', value: inv.warehouseName },
    ];
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.invoiceService
      .getInvoiceById(this.id())
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (inv) => {
          this.invoice.set(inv);
          if (inv.number) this.loadPayments();
        },
        error: (err: unknown) => this.error.set(errorTranslationKey(err)),
      });
  }

  private loadPayments(): void {
    this.paymentService
      .getPayments({ invoiceId: this.id(), limit: 100, sort: 'date' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (page) => this.payments.set(page.items), error: () => this.payments.set([]) });
  }

  protected issue(): void {
    this.dialogs
      .confirm({ titleKey: 'invoices.issueTitle', messageKey: 'invoices.issueMessage', confirmKey: 'invoices.issue' })
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.run(this.invoiceService.issueInvoice(this.id()), 'invoices.issued'));
  }

  protected readonly cancel = (): void => {
    this.dialogs
      .prompt({
        titleKey: 'invoices.cancelTitle',
        messageKey: 'invoices.cancelMessage',
        labelKey: 'invoices.cancelReason',
        confirmKey: 'invoices.cancel',
        minLength: 3,
        danger: true,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((reason) => this.run(this.invoiceService.cancelInvoice(this.id(), reason), 'invoices.cancelled'));
  }

  protected readonly remove = (): void => {
    this.dialogs
      .confirm({ titleKey: 'invoices.deleteTitle', messageKey: 'invoices.deleteMessage', confirmKey: 'common.delete', danger: true })
      .pipe(
        filter(Boolean),
        switchMap(() => this.invoiceService.deleteInvoice(this.id())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toast.success('common.deleted');
          void this.router.navigateByUrl('/app/sales/invoices');
        },
        error: (err: unknown) => this.toast.error(errorTranslationKey(err)),
      });
  }

  protected recordPayment(): void {
    const inv = this.invoice();
    if (!inv) return;
    this.dialogs
      .open<PaymentDialog, PaymentDialogData, Payment>(PaymentDialog, { header: 'payments.add', data: { invoice: inv }, width: '600px' })
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.toast.success('payments.recorded');
        this.load();
      });
  }

  protected readonly print = (): void => window.print();

  private run(request: Observable<Invoice>, successKey: string): void {
    this.busy.set(true);
    this.stockError.set(null);
    request
      .pipe(
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (inv) => {
          this.invoice.set(inv);
          this.toast.success(successKey);
          if (inv.number) this.loadPayments();
        },
        error: (err: unknown) => {
          this.stockError.set(this.describeShortage(err));
          this.toast.error(errorTranslationKey(err));
        },
      });
  }

  /** INSUFFICIENT_STOCK details carry productId + "available:N". */
  private describeShortage(err: unknown): string | null {
    if (!(err instanceof HttpErrorResponse)) return null;
    const body = err.error as Partial<ApiError> | null;
    if (body?.error?.code !== 'INSUFFICIENT_STOCK') return null;
    const names = new Map((this.invoice()?.lines ?? []).map((l) => [l.productId, l.description]));
    return (body.error.details ?? [])
      .map((d) => {
        const available = d.message.replace('available:', '');
        return this.translate.instant('invoices.shortageItem', { product: names.get(d.path) ?? d.path, available }) as string;
      })
      .join('، ');
  }
}
