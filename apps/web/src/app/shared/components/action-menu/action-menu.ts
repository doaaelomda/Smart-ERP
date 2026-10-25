import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import type { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { LanguageService } from '../../../core/i18n/language.service';

export interface ActionMenuItem {
  labelKey: string;
  /** Material Symbols name. */
  icon: string;
  action: () => void;
  danger?: boolean;
  /** Hidden when false (e.g. the API says the action isn't allowed). */
  visible?: boolean;
}

/** "⋮" button with a PrimeNG popup menu. */
@Component({
  selector: 'app-action-menu',
  imports: [ButtonModule, MenuModule, TranslatePipe],
  template: `
    <button
      pButton
      type="button"
      [text]="true"
      [rounded]="true"
      severity="secondary"
      (click)="menu.toggle($event)"
      [attr.aria-label]="'common.more' | translate"
      aria-haspopup="true"
    >
      <span class="material-symbols-outlined">more_vert</span>
    </button>
    <p-menu #menu [model]="model()" [popup]="true" appendTo="body">
      <ng-template #item let-item>
        <a class="p-menu-item-link flex items-center gap-3" [class.!text-danger]="item.styleClass === 'danger'">
          <span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </a>
      </ng-template>
    </p-menu>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionMenu {
  readonly items = input.required<ActionMenuItem[]>();

  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);

  protected readonly model = computed<MenuItem[]>(() => {
    this.language.language();
    return this.items()
      .filter((i) => i.visible !== false)
      .map((i) => ({
        label: this.translate.instant(i.labelKey) as string,
        icon: i.icon,
        styleClass: i.danger ? 'danger' : undefined,
        command: () => i.action(),
      }));
  });
}
