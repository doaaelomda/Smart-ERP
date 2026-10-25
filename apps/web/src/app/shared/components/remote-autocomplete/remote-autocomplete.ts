import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, type OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type AbstractControl, type ControlValueAccessor, FormControl, NgControl, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AutoCompleteModule, type AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { catchError, type Observable, of, Subject, switchMap } from 'rxjs';
import { Field } from '../field/field';

export interface AutocompleteOption<T = unknown> {
  id: string;
  label: string;
  sublabel?: string;
  data?: T;
}

let nextId = 0;

/**
 * Server-side search select (PrimeNG AutoComplete). The form value is the selected id;
 * `selected` emits the full option. Typing without picking an option clears the value.
 * <app-remote-autocomplete formControlName="customerId" [search]="searchCustomers" label="..." [initialLabel]="name" />
 */
@Component({
  selector: 'app-remote-autocomplete',
  imports: [NgTemplateOutlet, ReactiveFormsModule, AutoCompleteModule, TranslatePipe, Field],
  template: `
    <ng-template #control>
      <p-autocomplete
        [formControl]="text"
        [suggestions]="options()"
        optionLabel="label"
        [inputId]="inputId"
        [placeholder]="(placeholder() ?? 'common.typeToSearch') | translate"
        [dropdown]="true"
        [forceSelection]="true"
        [completeOnFocus]="true"
        [delay]="250"
        [fluid]="true"
        [invalid]="invalid()"
        [showEmptyMessage]="true"
        [emptyMessage]="'common.noResults' | translate"
        [ariaLabel]="(label() ?? placeholder() ?? 'common.typeToSearch') | translate"
        appendTo="body"
        (completeMethod)="queries.next($event.query)"
        (onSelect)="onSelected($event)"
        (onClear)="clearValue()"
        (onBlur)="onTouched()"
      >
        <ng-template #item let-option>
          <div class="flex flex-col leading-tight">
            <span>{{ option.label }}</span>
            @if (option.sublabel) {
              <span class="text-caption text-muted">{{ option.sublabel }}</span>
            }
          </div>
        </ng-template>
      </p-autocomplete>
    </ng-template>

    @if (label()) {
      <app-field [label]="label()" [for]="inputId" [control]="parentControl()">
        <ng-container [ngTemplateOutlet]="control" />
      </app-field>
    } @else {
      <ng-container [ngTemplateOutlet]="control" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RemoteAutocomplete implements ControlValueAccessor, OnInit {
  readonly search = input.required<(term: string) => Observable<AutocompleteOption[]>>();
  readonly label = input<string>();
  readonly placeholder = input<string>();
  /** Kept for API compatibility (icons are not shown inside the PrimeNG input). */
  readonly icon = input<string>();
  /** Shown before the user searches (edit forms). */
  readonly initialLabel = input<string>();
  readonly dense = input(false);
  readonly selected = output<AutocompleteOption>();

  protected readonly inputId = `ac-${nextId++}`;
  protected readonly text = new FormControl<AutocompleteOption | string | null>(null);
  protected readonly options = signal<AutocompleteOption[]>([]);
  protected readonly invalid = signal(false);
  protected readonly parentControl = signal<AbstractControl | null>(null);
  protected readonly queries = new Subject<string>();

  /** The parent's control (formControlName) drives the error state. */
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private value: string | null = null;
  private onChange: (value: string | null) => void = () => {};
  protected onTouched: () => void = () => {};

  constructor() {
    if (this.ngControl) this.ngControl.valueAccessor = this;

    this.queries
      .pipe(
        switchMap((term) => this.search()(term.trim()).pipe(catchError(() => of([])))),
        takeUntilDestroyed(),
      )
      .subscribe((options) => this.options.set(options));

    // forceSelection clears free text: keep the form value in sync.
    this.text.valueChanges.pipe(takeUntilDestroyed()).subscribe((v) => {
      if ((v === null || v === '' || typeof v === 'string') && this.value) this.clearValue();
    });

    // Edit forms may get the label after the value (async load).
    effect(() => {
      const label = this.initialLabel();
      if (label && this.value && typeof this.text.value !== 'object') {
        this.text.setValue({ id: this.value, label }, { emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    const control = this.ngControl?.control ?? null;
    this.parentControl.set(control);
    control?.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.invalid.set(control.invalid && control.touched));
  }

  protected onSelected(event: AutoCompleteSelectEvent): void {
    const option = event.value as AutocompleteOption;
    this.value = option.id;
    this.onChange(option.id);
    this.selected.emit(option);
  }

  protected clearValue(): void {
    this.value = null;
    this.onChange(null);
  }

  writeValue(value: string | null): void {
    this.value = value;
    const label = this.initialLabel();
    this.text.setValue(value ? { id: value, label: label ?? '' } : null, { emitEvent: false });
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    if (disabled) this.text.disable({ emitEvent: false });
    else this.text.enable({ emitEvent: false });
  }
}
