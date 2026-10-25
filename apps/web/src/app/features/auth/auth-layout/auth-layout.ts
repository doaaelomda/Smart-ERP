import { Dir } from '@angular/cdk/bidi';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { LanguageService } from '../../../core/i18n/language.service';
import { Logo } from '../../../shared/components/logo/logo';
import { ThemeToggle } from '../../../shared/components/theme-toggle/theme-toggle';

@Component({
  selector: 'app-auth-layout',
  imports: [ButtonModule, Dir, RouterOutlet, RouterLink, TranslatePipe, Logo, ThemeToggle],
  template: `
    <div [dir]="language.direction()" class="grid min-h-dvh bg-app-bg lg:grid-cols-[1fr_1.1fr]">
      <!-- Brand panel -->
      <aside
        class="relative hidden overflow-hidden bg-gradient-to-br from-[#1d4ed8] to-[#6d28d9] p-12 text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col"
      >
        <div class="pointer-events-none absolute -bottom-32 -end-32 size-[420px] rounded-full bg-white/10 blur-2xl" aria-hidden="true"></div>
        <a routerLink="/" class="inline-flex items-center gap-2.5 text-white no-underline">
          <span class="inline-flex size-9 items-center justify-center rounded-xl bg-white/15" aria-hidden="true">
            <span class="material-symbols-outlined text-[20px]">deployed_code</span>
          </span>
          <span class="text-title font-bold">{{ 'common.appName' | translate }}</span>
        </a>
        <div class="relative mt-auto max-w-md">
          <h2 class="m-0 mb-4 text-[2rem] font-bold leading-tight">{{ 'auth.brandTitle' | translate }}</h2>
          <p class="m-0 mb-8 text-title text-white/80">{{ 'auth.brandText' | translate }}</p>
          <ul class="m-0 flex list-none flex-col gap-3 p-0">
            @for (point of points; track point) {
              <li class="flex items-center gap-3 text-body">
                <span class="material-symbols-outlined rounded-full bg-white/15 p-1 text-[18px]" aria-hidden="true">check</span>
                {{ 'auth.points.' + point | translate }}
              </li>
            }
          </ul>
        </div>
      </aside>

      <!-- Form side -->
      <main class="flex min-h-dvh flex-col">
        <header class="flex items-center justify-between p-4 sm:p-6">
          <app-logo class="lg:invisible" />
          <div class="flex items-center gap-1">
            <app-theme-toggle />
            <button pButton [text]="true" type="button" (click)="language.toggle()">{{ 'common.language' | translate }}</button>
          </div>
        </header>
        <div class="flex flex-1 items-center justify-center px-4 pb-8">
          <div class="w-full max-w-md">
            <router-outlet />
          </div>
        </div>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {
  protected readonly language = inject(LanguageService);
  protected readonly points = ['sales', 'inventory', 'secure'];
}
