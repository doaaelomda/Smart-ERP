import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { SelectButtonModule } from 'primeng/selectbutton';
import { LanguageService } from '../../../core/i18n/language.service';

export interface FilterTab {
  value: string;
  labelKey: string;
}

/**
 * Status / type filter above lists (PrimeNG SelectButton, scrolls horizontally on phones).
 * <app-filter-tabs [options]="tabs" [value]="current" (valueChange)="set($event)" />
 */
@Component({
  selector: 'app-filter-tabs',
  imports: [FormsModule, SelectButtonModule],
  host: { class: 'block max-w-full overflow-x-auto pb-1' },
  template: `
    <p-selectbutton
      [options]="items()"
      optionLabel="label"
      optionValue="value"
      [ngModel]="value()"
      (ngModelChange)="valueChange.emit($event ?? value())"
      [allowEmpty]="false"
      size="small"
      styleClass="whitespace-nowrap"
      [attr.aria-label]="ariaLabel()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterTabs {
  readonly options = input.required<FilterTab[]>();
  readonly value = input<string>('');
  readonly ariaLabel = input<string>();
  readonly valueChange = output<string>();

  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);

  protected readonly items = computed(() => {
    this.language.language(); // re-translate on language change
    return this.options().map((o) => ({ value: o.value, label: this.translate.instant(o.labelKey) as string }));
  });
}
