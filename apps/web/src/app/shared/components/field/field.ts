import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { type AbstractControl, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { map, of, startWith, switchMap } from 'rxjs';

interface FieldError {
  key: string;
  params?: Record<string, unknown>;
}

/** Default messages for Angular validators; `errors` can override per field. */
function defaultError(name: string, value: unknown): FieldError {
  const v = value as Record<string, number> | null;
  switch (name) {
    case 'required':
      return { key: 'validation.required' };
    case 'email':
      return { key: 'validation.email' };
    case 'minlength':
      return { key: 'validation.minLength', params: { min: v?.['requiredLength'] } };
    case 'maxlength':
      return { key: 'validation.maxLength', params: { max: v?.['requiredLength'] } };
    case 'min':
      return v?.['min'] && v['min'] > 0 && v['min'] < 1 ? { key: 'validation.positive' } : { key: 'validation.min', params: { min: v?.['min'] } };
    case 'max':
      return { key: 'validation.max', params: { max: v?.['max'] } };
    default:
      return { key: `validation.${name}` };
  }
}

/**
 * Form field shell for PrimeNG inputs: label, the projected control, then hint or the first error
 * (translated automatically from the control's validators).
 *
 * <app-field label="customers.fields.name" for="name" [control]="form.controls.name">
 *   <input pInputText id="name" formControlName="name" />
 * </app-field>
 */
@Component({
  selector: 'app-field',
  imports: [TranslatePipe],
  host: { class: 'block', '[attr.data-invalid]': 'error() ? "" : null' },
  template: `
    <div class="flex flex-col gap-1.5">
      @if (label()) {
        <!-- prettier-ignore -->
        <label [attr.for]="for()" class="text-label font-semibold text-on-surface">{{ label()! | translate: labelParams() }}@if (isRequired()) {<span class="ms-0.5 text-danger" aria-hidden="true">*</span>}</label>
      }
      <ng-content />
      @if (error(); as e) {
        <small class="text-caption text-danger" role="alert">{{ e.key | translate: e.params }}</small>
      } @else if (hint()) {
        <small class="text-caption text-muted">{{ hint()! | translate }}</small>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Field {
  readonly label = input<string>();
  readonly labelParams = input<Record<string, unknown>>();
  /** id of the input, for the <label for>. */
  readonly for = input<string>();
  readonly hint = input<string>();
  readonly control = input<AbstractControl | null>(null);
  /** Override messages: { max: 'payments.maxAmount' }. */
  readonly errors = input<Record<string, string>>({});

  private readonly state = signal(0);

  protected readonly isRequired = computed(() => {
    this.state();
    return !!this.control()?.hasValidator(Validators.required);
  });

  protected readonly error = computed<FieldError | null>(() => {
    this.state();
    const control = this.control();
    if (!control || !control.invalid || !control.touched || !control.errors) return null;
    const [name, value] = Object.entries(control.errors)[0]!;
    const custom = this.errors()[name];
    return custom ? { key: custom, params: value as Record<string, unknown> } : defaultError(name, value);
  });

  constructor() {
    // Re-evaluate on value / status / touched changes (works with OnPush parents).
    toObservable(this.control)
      .pipe(
        switchMap((control) => (control ? control.events.pipe(startWith(null)) : of(null))),
        map(() => this.state.update((n) => n + 1)),
        takeUntilDestroyed(),
      )
      .subscribe();
  }
}
