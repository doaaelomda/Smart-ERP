import { Dir } from '@angular/cdk/bidi';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { LanguageService } from '../../core/i18n/language.service';
import { Logo } from '../../shared/components/logo/logo';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';

@Component({
  selector: 'app-landing',
  imports: [ButtonModule, Dir, RouterLink, TranslatePipe, Logo, ThemeToggle],
  templateUrl: './landing.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing {
  protected readonly language = inject(LanguageService);

  protected readonly checks = ['bilingual', 'multiTenant', 'secure'];

  protected readonly features = [
    { key: 'sales', icon: 'receipt_long', tile: 'bg-info-soft text-info' },
    { key: 'inventory', icon: 'inventory_2', tile: 'bg-success-soft text-success' },
    { key: 'purchasing', icon: 'local_shipping', tile: 'bg-warning-soft text-warning' },
    { key: 'insights', icon: 'insights', tile: 'bg-violet-soft text-violet' },
    { key: 'roles', icon: 'admin_panel_settings', tile: 'bg-danger-soft text-danger' },
    { key: 'bilingual', icon: 'translate', tile: 'bg-info-soft text-info' },
  ];

  protected readonly steps = ['one', 'two', 'three'];

  /** Purely decorative preview bars (not real data). */
  protected readonly previewBars = [38, 52, 45, 60, 55, 72, 66, 80, 74, 88, 82, 95];
}
