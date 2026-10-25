import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { map } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';

/** App layout: fixed sidebar on desktop (collapsible), PrimeNG drawer on tablets/phones. */
@Component({
  selector: 'app-shell',
  imports: [DrawerModule, RouterOutlet, Header, Sidebar],
  templateUrl: './shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  protected readonly language = inject(LanguageService);

  protected readonly isCompact = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 1023.98px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  protected readonly desktopOpened = signal(true);
  protected readonly mobileOpened = signal(false);
  protected readonly drawerPosition = computed(() => (this.language.isRtl() ? 'right' : 'left'));

  protected toggle(): void {
    if (this.isCompact()) this.mobileOpened.update((v) => !v);
    else this.desktopOpened.update((v) => !v);
  }

  protected closeOnMobile(): void {
    if (this.isCompact()) this.mobileOpened.set(false);
  }
}
