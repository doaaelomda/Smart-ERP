import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';

/** Shown inside the shell for sidebar routes that are not built yet. */
@Component({
  selector: 'app-coming-soon-page',
  imports: [ButtonModule, RouterLink, TranslatePipe],
  template: `
    <div class="card flex flex-col items-center gap-4 px-6 py-20 text-center">
      <span class="icon-tile !size-16 bg-info-soft text-info">
        <span class="material-symbols-outlined text-[32px]" aria-hidden="true">construction</span>
      </span>
      <h1 class="m-0 text-headline font-bold">{{ 'comingSoon.title' | translate }}</h1>
      <p class="m-0 max-w-md text-body text-muted">{{ 'comingSoon.text' | translate }}</p>
      <a pButton routerLink="/app/dashboard">{{ 'comingSoon.back' | translate }}</a>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComingSoonPage {}
