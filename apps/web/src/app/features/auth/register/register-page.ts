import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  type AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { PASSWORD_MIN_LENGTH, PASSWORD_PATTERN } from '@erp/shared';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { errorTranslationKey } from '../../../core/http/api-error';
import { ErrorBanner } from '../../../shared/components/error-banner/error-banner';
import { Field } from '../../../shared/components/field/field';
import { LanguageService } from '../../../core/i18n/language.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value as string;
  const confirm = group.get('confirmPassword');
  if (!confirm) return null;
  const mismatch = !!confirm.value && password !== confirm.value;
  confirm.setErrors(mismatch ? { mismatch: true } : confirm.hasError('required') ? { required: true } : null);
  return null;
}

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, IconFieldModule, InputGroupModule, InputGroupAddonModule, InputIconModule, InputTextModule, TranslatePipe, ErrorBanner, Field],
  templateUrl: './register-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      companyName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  private readonly password = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  protected readonly passwordRules = computed(() => {
    const value = this.password();
    return [
      { key: 'length', ok: value.length >= PASSWORD_MIN_LENGTH },
      { key: 'letter', ok: /[A-Za-z]/.test(value) },
      { key: 'number', ok: /\d/.test(value) },
    ];
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    const { companyName, name, email, password } = this.form.getRawValue();
    this.auth
      .register({ companyName, name, email, password, language: this.language.language() })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => void this.router.navigateByUrl('/app/dashboard'),
        error: (err: unknown) => this.error.set(errorTranslationKey(err)),
      });
  }
}
