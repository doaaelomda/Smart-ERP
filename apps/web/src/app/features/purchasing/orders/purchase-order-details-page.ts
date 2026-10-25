import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, type OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ActionMenu } from '../../../shared/components/action-menu/action-menu';
import { ButtonModule } from 'primeng/button';
import type { PurchaseOrder } from '@erp/shared';
import { filter, finalize, type Observable, switchMap } from 'rxjs';
import { errorTranslationKey } from '../../../core/http/api-error';
import { DialogService } from '../../../core/ui/dialog.service';
import { ToastService } from '../../../core/ui/toast.service';
import { ErrorBanner } from '../../../shared/components/error-banner/error-banner';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Skeleton } from '../../../shared/components/skeleton/skeleton';
import { StatusPill } from '../../../shared/components/status-pill/status-pill';
import { type DocumentMetaItem, DocumentView } from '../../documents/document-view/document-view';
import { purchaseOrderDisplayStatus } from '../../sales/document-status';
import { PurchaseOrderService } from '../purchase-order.service';
import { ReceiveDialog, type ReceiveDialogData } from './receive-dialog';

@Component({
  selector: 'app-purchase-order-details-page',
  imports: [ActionMenu, ButtonModule, RouterLink, TranslatePipe, ErrorBanner, PageHeader, Skeleton, StatusPill, DocumentView],
  template: `
    @if (loading() && !order()) {
      <section class="card p-6"><app-skeleton type="text" [count]="6" /></section>
    } @else if (error() && !order()) {
      <app-error-banner [message]="error()!" (retry)="load()" />
    } @else if (order(); as po) {
      <app-page-header title="purchaseOrders.titleNumber" [titleParams]="{ number: po.number }" backLink="/app/purchasing/orders" backLabel="purchaseOrders.title">
        <app-status-pill badge [status]="status()" />
        @if (po.actions?.edit) {
          <a pButton [outlined]="true" [routerLink]="['edit']"><span class="material-symbols-outlined" aria-hidden="true">edit</span>{{ 'common.edit' | translate }}</a>
        }
        @if (po.actions?.send) {
          <button pButton type="button" (click)="send()" [disabled]="busy()">
            <span class="material-symbols-outlined" aria-hidden="true">send</span>{{ 'purchaseOrders.send' | translate }}
          </button>
        }
        @if (po.actions?.receive) {
          <button pButton type="button" (click)="receive()" [disabled]="busy()">
            <span class="material-symbols-outlined" aria-hidden="true">move_to_inbox</span>{{ 'purchaseOrders.receive' | translate }}
          </button>
        }
        <app-action-menu [items]="[
            { labelKey: 'documents.print', icon: 'print', action: print },
            { labelKey: 'purchaseOrders.cancel', icon: 'block', action: cancel, danger: true, visible: !!po.actions?.cancel },
            { labelKey: 'common.delete', icon: 'delete', action: remove, danger: true, visible: !!po.actions?.delete },
          ]" />
      </app-page-header>

      <app-document-view
        partyLabel="documents.fields.supplier"
        [partyName]="po.supplierName"
        [meta]="meta()"
        [lines]="po.lines"
        [totals]="po"
        [notes]="po.notes"
        [showReceived]="po.status !== 'draft'"
        priceLabel="documents.fields.unitCost"
      />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrderDetailsPage implements OnInit {
  readonly id = input.required<string>();

  private readonly poService = inject(PurchaseOrderService);
  private readonly dialogs = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly order = signal<PurchaseOrder | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly status = computed(() => {
    const po = this.order();
    return po ? purchaseOrderDisplayStatus(po) : 'draft';
  });

  protected readonly meta = computed<DocumentMetaItem[]>(() => {
    const po = this.order();
    if (!po) return [];
    return [
      { labelKey: 'purchaseOrders.fields.orderDate', value: po.orderDate, type: 'date' },
      { labelKey: 'documents.fields.expectedDate', value: po.expectedDate, type: 'date', danger: !!po.isLate },
      { labelKey: 'documents.fields.warehouse', value: po.warehouseName },
    ];
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.poService
      .getPurchaseOrderById(this.id())
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({ next: (po) => this.order.set(po), error: (err: unknown) => this.error.set(errorTranslationKey(err)) });
  }

  protected send(): void {
    this.run(this.poService.sendPurchaseOrder(this.id()), 'purchaseOrders.sent');
  }

  protected readonly cancel = (): void => {
    this.dialogs
      .confirm({ titleKey: 'purchaseOrders.cancelTitle', messageKey: 'purchaseOrders.cancelMessage', confirmKey: 'purchaseOrders.cancel', danger: true })
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.run(this.poService.cancelPurchaseOrder(this.id()), 'purchaseOrders.cancelled'));
  }

  protected receive(): void {
    const order = this.order();
    if (!order) return;
    this.dialogs
      .open<ReceiveDialog, ReceiveDialogData, PurchaseOrder>(ReceiveDialog, { header: 'purchaseOrders.receive', data: { order }, width: '620px' })
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe((po) => {
        this.order.set(po);
        this.toast.success('purchaseOrders.receivedDone');
      });
  }

  protected readonly remove = (): void => {
    this.dialogs
      .confirm({ titleKey: 'purchaseOrders.deleteTitle', messageKey: 'common.deleteMessage', params: { name: this.order()?.number }, confirmKey: 'common.delete', danger: true })
      .pipe(
        filter(Boolean),
        switchMap(() => this.poService.deletePurchaseOrder(this.id())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toast.success('common.deleted');
          void this.router.navigateByUrl('/app/purchasing/orders');
        },
        error: (err: unknown) => this.toast.error(errorTranslationKey(err)),
      });
  }

  protected readonly print = (): void => window.print();

  private run(request: Observable<PurchaseOrder>, successKey: string): void {
    this.busy.set(true);
    request
      .pipe(
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (po) => {
          this.order.set(po);
          this.toast.success(successKey);
        },
        error: (err: unknown) => this.toast.error(errorTranslationKey(err)),
      });
  }
}
