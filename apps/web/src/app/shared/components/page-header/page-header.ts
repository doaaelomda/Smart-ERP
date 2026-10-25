import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Page title row. Actions go in the content slot.
 * <app-page-header title="products.title" subtitle="products.subtitle"><button …/></app-page-header>
 */
@Component({
  selector: 'app-page-header',
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        @if (backLink()) {
          <a
            [routerLink]="backLink()"
            class="mb-2 inline-flex items-center gap-1 text-label text-muted no-underline hover:text-on-surface"
          >
            <span class="material-symbols-outlined !text-[18px] rtl:rotate-180" aria-hidden="true">arrow_back</span>
            {{ (backLabel() ?? 'common.back') | translate }}
          </a>
        }
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="m-0 text-headline font-bold tracking-tight">{{ title() | translate: titleParams() }}</h1>
          <ng-content select="[badge]" />
        </div>
        @if (subtitle()) {
          <p class="m-0 mt-1 text-body text-muted">{{ subtitle()! | translate }}</p>
        }
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ng-content />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly titleParams = input<Record<string, unknown>>();
  readonly subtitle = input<string>();
  readonly backLink = input<string>();
  readonly backLabel = input<string>();
}
