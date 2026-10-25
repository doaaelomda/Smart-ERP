import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, type OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ActionMenu } from '../../../shared/components/action-menu/action-menu';
import { ButtonModule } from 'primeng/button';
import type { Quotation } from '@erp/shared';
import { filter, finalize, type Observable, switchMap } from 'rxjs';
import { errorTranslationKey } from '../../../core/http/api-error';
import { DialogService } from '../../../core/ui/dialog.service';
import { ToastService } from '../../../core/ui/toast.service';
import { ErrorBanner } from '../../../shared/components/error-banner/error-banner';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Skeleton } from '../../../shared/components/skeleton/skeleton';
import { StatusPill } from '../../../shared/components/status-pill/status-pill';
import { type DocumentMetaItem, DocumentView } from '../../documents/document-view/document-view';
import { quotationDisplayStatus } from '../document-status';
import { QuotationService } from '../quotation.service';

@Component({
  selector: 'app-quotation-details-page',
  imports: [ActionMenu, ButtonModule, RouterLink, TranslatePipe, ErrorBanner, PageHeader, Skeleton, StatusPill, DocumentView],
  template: `
    @if (loading() && !quotation()) {
      <section class="card p-6"><app-skeleton type="text" [count]="6" /></section>
    } @else if (error() && !quotation()) {
      <app-error-banner [message]="error()!" (retry)="load()" />
    } @else if (quotation(); as q) {
      <app-page-header title="quotations.titleNumber" [titleParams]="{ number: q.number }" backLink="/app/sales/quotations" backLabel="quotations.title">
        <app-status-pill badge [status]="status()" />
        @if (q.actions?.edit) {
          <a pButton [outlined]="true" [routerLink]="['edit']"><span class="material-symbols-outlined" aria-hidden="true">edit</span>{{ 'common.edit' | translate }}</a>
        }
        @if (q.actions?.send) {
          <button pButton type="button" (click)="changeStatus('send')" [disabled]="busy()">
            <span class="material-symbols-outlined" aria-hidden="true">send</span>{{ 'quotations.send' | translate }}
          </button>
        }
        @if (q.actions?.reject) {
          <button pButton [outlined]="true" type="button" (click)="changeStatus('reject')" [disabled]="busy()">
            <span class="material-symbols-outlined" aria-hidden="true">thumb_down</span>{{ 'quotations.reject' | translate }}
          </button>
        }
        @if (q.actions?.accept) {
          <button pButton type="button" (click)="changeStatus('accept')" [disabled]="busy()">
            <span class="material-symbols-outlined" aria-hidden="true">thumb_up</span>{{ 'quotations.accept' | translate }}
          </button>
        }
        @if (q.actions?.convert) {
          <button pButton type="button" (click)="convert()" [disabled]="busy()">
            <span class="material-symbols-outlined" aria-hidden="true">receipt_long</span>{{ 'quotations.convert' | translate }}
          </button>
        }
        @if (q.invoiceId) {
          <a pButton [outlined]="true" [routerLink]="['/app/sales/invoices', q.invoiceId]">
            <span class="material-symbols-outlined" aria-hidden="true">receipt_long</span>{{ 'quotations.viewInvoice' | translate }}
          </a>
        }
        <app-action-menu [items]="[
            { labelKey: 'documents.print', icon: 'print', action: print },
            { labelKey: 'common.delete', icon: 'delete', action: remove, danger: true, visible: !!q.actions?.delete },
          ]" />
      </app-page-header>

      <app-document-view partyLabel="documents.fields.customer" [partyName]="q.customerName" [meta]="meta()" [lines]="q.lines" [totals]="q" [notes]="q.notes" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotationDetailsPage implements OnInit {
  readonly id = input.required<string>();

  private readonly quotationService = inject(QuotationService);
  private readonly dialogs = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly quotation = signal<Quotation | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly status = computed(() => {
    const q = this.quotation();
    return q ? quotationDisplayStatus(q) : 'draft';
  });

  protected readonly meta = computed<DocumentMetaItem[]>(() => {
    const q = this.quotation();
    if (!q) return [];
    return [
      { labelKey: 'quotations.fields.date', value: q.createdAt, type: 'date' },
      { labelKey: 'documents.fields.validUntil', value: q.validUntil, type: 'date', danger: !!q.isExpired },
    ];
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.quotationService
      .getQuotationById(this.id())
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({ next: (q) => this.quotation.set(q), error: (err: unknown) => this.error.set(errorTranslationKey(err)) });
  }

  protected changeStatus(action: 'send' | 'accept' | 'reject'): void {
    this.run(this.quotationService.changeQuotationStatus(this.id(), action), `quotations.${action}Done`);
  }

  protected convert(): void {
    this.dialogs
      .confirm({ titleKey: 'quotations.convertTitle', messageKey: 'quotations.convertMessage', confirmKey: 'quotations.convert' })
      .pipe(
        filter(Boolean),
        switchMap(() => {
          this.busy.set(true);
          return this.quotationService.convertQuotationToInvoice(this.id()).pipe(finalize(() => this.busy.set(false)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (invoiceId) => {
          this.toast.success('quotations.converted');
          void this.router.navigate(['/app/sales/invoices', invoiceId]);
        },
        error: (err: unknown) => this.toast.error(errorTranslationKey(err)),
      });
  }

  protected readonly remove = (): void => {
    this.dialogs
      .confirm({ titleKey: 'quotations.deleteTitle', messageKey: 'common.deleteMessage', params: { name: this.quotation()?.number }, confirmKey: 'common.delete', danger: true })
      .pipe(
        filter(Boolean),
        switchMap(() => this.quotationService.deleteQuotation(this.id())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toast.success('common.deleted');
          void this.router.navigateByUrl('/app/sales/quotations');
        },
        error: (err: unknown) => this.toast.error(errorTranslationKey(err)),
      });
  }

  protected readonly print = (): void => window.print();

  private run(request: Observable<Quotation>, successKey: string): void {
    this.busy.set(true);
    request
      .pipe(
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (q) => {
          this.quotation.set(q);
          this.toast.success(successKey);
        },
        error: (err: unknown) => this.toast.error(errorTranslationKey(err)),
      });
  }
}
