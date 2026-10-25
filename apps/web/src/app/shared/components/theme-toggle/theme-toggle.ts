import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ThemeService } from '../../../core/theme/theme.service';

@Component({
  selector: 'app-theme-toggle',
  imports: [ButtonModule, TooltipModule, TranslatePipe],
  template: `
    @let label = (theme.isDark() ? 'common.lightMode' : 'common.darkMode') | translate;
    <button pButton type="button" [text]="true" [rounded]="true" severity="secondary" (click)="theme.toggle()" [pTooltip]="label" tooltipPosition="bottom" [attr.aria-label]="label">
      <span class="material-symbols-outlined">{{ theme.isDark() ? 'light_mode' : 'dark_mode' }}</span>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);
}
