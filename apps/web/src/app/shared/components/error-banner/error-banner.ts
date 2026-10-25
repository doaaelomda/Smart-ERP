import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

/** Inline error with an optional retry button. `message` is a translation key. */
@Component({
  selector: 'app-error-banner',
  imports: [ButtonModule, MessageModule, TranslatePipe],
  template: `
    <p-message severity="error" styleClass="mb-4 w-full" role="alert">
      <div class="flex w-full flex-wrap items-center gap-3">
        <span class="material-symbols-outlined" aria-hidden="true">error</span>
        <span class="flex-1">{{ message() | translate: params() }}</span>
        @if (retryable()) {
          <p-button [label]="'common.retry' | translate" severity="danger" [text]="true" size="small" (onClick)="retry.emit()" />
        }
      </div>
    </p-message>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorBanner {
  readonly message = input.required<string>();
  readonly params = input<Record<string, unknown>>();
  readonly retryable = input(true);
  readonly retry = output<void>();
}
