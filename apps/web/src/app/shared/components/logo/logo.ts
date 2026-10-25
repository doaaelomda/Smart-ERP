import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-logo',
  imports: [TranslatePipe],
  template: `
    <span
      class="inline-flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#1d4ed8] to-[#7c3aed] text-white shadow-card"
      aria-hidden="true"
    >
      <span class="material-symbols-outlined text-[20px]">deployed_code</span>
    </span>
    @if (showText()) {
      <span class="text-title font-bold tracking-tight">{{ 'common.appName' | translate }}</span>
    }
  `,
  host: { class: 'inline-flex items-center gap-2.5' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Logo {
  readonly showText = input(true);
}
