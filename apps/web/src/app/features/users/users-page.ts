import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import type { ManagedUser } from '@erp/shared';
import { filter, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { HasPermission } from '../../core/auth/has-permission.directive';
import { errorTranslationKey } from '../../core/http/api-error';
import { createListState } from '../../core/http/list-state';
import { DialogService } from '../../core/ui/dialog.service';
import { ToastService } from '../../core/ui/toast.service';
import { DataTable } from '../../shared/components/data-table/data-table';
import { DataTableCell } from '../../shared/components/data-table/data-table-cell.directive';
import type { DataTableColumn } from '../../shared/components/data-table/data-table.types';
import { ErrorBanner } from '../../shared/components/error-banner/error-banner';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatusPill } from '../../shared/components/status-pill/status-pill';
import { UserFormDialog, type UserFormDialogData } from './user-form-dialog/user-form-dialog';
import { UserService } from './user.service';

@Component({
  selector: 'app-users-page',
  imports: [ButtonModule, TagModule, TooltipModule, TranslatePipe, DataTable, DataTableCell, HasPermission, ErrorBanner, PageHeader, StatusPill],
  template: `
    <app-page-header title="users.title" subtitle="users.subtitle">
      <button pButton type="button" (click)="openForm()" *appHasPermission="'users.create'">
        <span class="material-symbols-outlined" aria-hidden="true">add</span>
        {{ 'users.add' | translate }}
      </button>
    </app-page-header>

    @if (list.error(); as errorKey) {
      <app-error-banner [message]="errorKey" (retry)="list.reload()" />
    }

    <section class="card p-4 sm:p-5">
      <app-data-table
        [columns]="columns()"
        [data]="list.items()"
        [total]="list.total()"
        [loading]="list.loading()"
        [query]="list.query()"
        (queryChange)="list.query.set($event)"
      >
        <ng-template appCell="name" let-row>
          <div class="py-1">
            <p class="m-0 font-semibold text-on-surface">{{ row.name }}</p>
            <p class="m-0 text-caption text-muted"><span class="num">{{ row.email }}</span></p>
          </div>
        </ng-template>
        <ng-template appCell="role" let-row>
          @if (row.role) {
            <p-tag [value]="'roles.' + row.role.name | translate" severity="info" [rounded]="true" />
          }
        </ng-template>
        <ng-template appCell="isActive" let-row>
          <app-status-pill [status]="row.isActive ? 'active' : 'inactive'" />
        </ng-template>
        <ng-template appCell="actions" let-row>
          <div class="flex justify-end gap-1">
            <button pButton [text]="true" [rounded]="true" severity="secondary" type="button" (click)="openForm(row)" tooltipPosition="top" [pTooltip]="'common.edit' | translate" [attr.aria-label]="'common.edit' | translate" *appHasPermission="'users.update'">
              <span class="material-symbols-outlined" aria-hidden="true">edit</span>
            </button>
            <ng-container *appHasPermission="'users.delete'">
              @if (row._id !== currentUserId()) {
                <button pButton [text]="true" [rounded]="true" severity="danger" type="button" (click)="delete(row)" tooltipPosition="top" [pTooltip]="'common.delete' | translate" [attr.aria-label]="'common.delete' | translate">
                  <span class="material-symbols-outlined" aria-hidden="true">delete</span>
                </button>
              }
            </ng-container>
          </div>
        </ng-template>
      </app-data-table>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersPage {
  private readonly userService = inject(UserService);
  private readonly dialogs = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly currentUserId = computed(() => this.auth.user()?.id);
  protected readonly list = createListState((q) => this.userService.getUsers(q), { sort: '-createdAt' });

  protected readonly columns = computed<DataTableColumn<ManagedUser>[]>(() => {
    this.auth.user();
    const canEdit = this.auth.hasPermission('users.update') || this.auth.hasPermission('users.delete');
    return [
      { key: 'name', header: 'users.fields.name', sortable: true },
      { key: 'role', header: 'users.fields.role' },
      { key: 'isActive', header: 'customers.fields.status' },
      ...(canEdit ? [{ key: 'actions', header: 'common.actions', cellClass: 'w-0 text-end' }] : []),
    ];
  });

  protected openForm(user?: ManagedUser): void {
    this.dialogs
      .open<UserFormDialog, UserFormDialogData, ManagedUser>(UserFormDialog, { header: user ? 'users.edit' : 'users.add', data: { user }, width: '560px' })
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.toast.success(user ? 'common.updated' : 'common.created');
        this.list.reload();
      });
  }

  protected delete(user: ManagedUser): void {
    this.dialogs
      .confirm({ titleKey: 'users.deleteTitle', messageKey: 'common.deleteMessage', params: { name: user.name }, confirmKey: 'common.delete', danger: true })
      .pipe(
        filter(Boolean),
        switchMap(() => this.userService.deleteUser(user._id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toast.success('common.deleted');
          this.list.afterDelete();
        },
        error: (err: unknown) => this.toast.error(errorTranslationKey(err)),
      });
  }
}
