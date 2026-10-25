import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

export interface ConfirmDialogData {
  titleKey: string;
  messageKey: string;
  params?: Record<string, unknown>;
  confirmKey?: string;
  /** Red confirm button for destructive actions. */
  danger?: boolean;
}

/** Generic yes/no dialog. Open it through `DialogService.confirm()`. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [ButtonModule, TranslatePipe],
  template: `
    <div class="flex items-start gap-3">
      <span
        class="icon-tile shrink-0"
        [class]="data.danger ? 'bg-danger-soft text-danger' : 'bg-info-soft text-info'"
        aria-hidden="true"
      >
        <span class="material-symbols-outlined">{{ data.danger ? 'warning' : 'help' }}</span>
      </span>
      <p class="m-0 pt-2 text-body text-muted">{{ data.messageKey | translate: data.params }}</p>
    </div>
    <div class="mt-6 flex justify-end gap-2">
      <p-button [label]="'common.cancel' | translate" severity="secondary" [text]="true" (onClick)="ref.close(false)" />
      <p-button
        [label]="(data.confirmKey ?? 'common.confirm') | translate"
        [severity]="data.danger ? 'danger' : 'primary'"
        [autofocus]="true"
        (onClick)="ref.close(true)"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  protected readonly ref = inject(DynamicDialogRef);
  protected readonly data = inject<DynamicDialogConfig<ConfirmDialogData>>(DynamicDialogConfig).data!;
}
