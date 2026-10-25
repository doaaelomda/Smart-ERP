import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type SkeletonType = 'text' | 'img' | 'circle';

/**
 * The single shared loading placeholder. Use `type` + `height` instead of creating new skeletons.
 * e.g. <app-skeleton type="img" height="120px" />, <app-skeleton type="text" [count]="3" />
 */
@Component({
  selector: 'app-skeleton',
  template: `
    @for (row of rows(); track $index) {
      <span
        class="block animate-pulse bg-surface-container-high"
        [class.rounded-md]="type() !== 'circle'"
        [class.rounded-full]="type() === 'circle'"
        [class.mb-2]="type() === 'text' && !$last"
        [style.height]="resolvedHeight()"
        [style.width]="resolvedWidth($last)"
        aria-hidden="true"
      ></span>
    }
  `,
  host: { class: 'block', role: 'status', '[attr.aria-busy]': 'true' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Skeleton {
  readonly type = input<SkeletonType>('text');
  readonly height = input<string>();
  readonly width = input<string>();
  readonly count = input(1);

  protected readonly rows = computed(() => Array.from({ length: Math.max(1, this.count()) }));

  protected readonly resolvedHeight = computed(
    () => this.height() ?? (this.type() === 'text' ? '0.875rem' : this.type() === 'circle' ? '2.5rem' : '8rem'),
  );

  protected resolvedWidth(isLast: boolean): string {
    if (this.width()) return this.width()!;
    if (this.type() === 'circle') return this.resolvedHeight();
    // Last text line is shorter to look natural.
    return this.type() === 'text' && isLast && this.count() > 1 ? '60%' : '100%';
  }
}
