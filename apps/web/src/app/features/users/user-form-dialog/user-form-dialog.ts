import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { PASSWORD_PATTERN, type ManagedUser } from '@erp/shared';
import { finalize } from 'rxjs';
import { errorTranslationKey } from '../../../core/http/api-error';
import { ErrorBanner } from '../../../shared/components/error-banner/error-banner';
import { Field } from '../../../shared/components/field/field';
import { UserService } from '../user.service';

export interface UserFormDialogData {
  /** Omit to create a new user. */
  user?: ManagedUser;
}

@Component({
  selector: 'app-user-form-dialog',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule, ToggleSwitchModule, TranslatePipe, ErrorBanner, Field],
  templateUrl: './user-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormDialog {
  private readonly users = inject(UserService);
  private readonly translate = inject(TranslateService);
  protected readonly dialogRef = inject<DynamicDialogRef<UserFormDialog>>(DynamicDialogRef);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly user = inject<DynamicDialogConfig<UserFormDialogData>>(DynamicDialogConfig).data?.user;
  protected readonly isEdit = !!this.user;
  protected readonly roles = signal<{ _id: string; label: string }[]>([]);

  // When editing, the password is optional (leave it empty to keep the current one).
  private readonly passwordRules = [Validators.pattern(PASSWORD_PATTERN)];

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: [this.user?.name ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email: [{ value: this.user?.email ?? '', disabled: this.isEdit }, [Validators.required, Validators.email]],
    roleId: [this.user?.role?.id ?? '', [Validators.required]],
    password: ['', this.isEdit ? this.passwordRules : [Validators.required, ...this.passwordRules]],
    isActive: [this.user?.isActive ?? true],
  });

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.users
      .getRoles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((roles) =>
        this.roles.set(roles.map((r) => ({ _id: r._id, label: this.translate.instant(`roles.${r.name}`) as string }))),
      );
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);

    const { name, email, roleId, password, isActive } = this.form.getRawValue();
    const request$ = this.user
      ? this.users.updateUser(this.user._id, { name: name.trim(), roleId, isActive, ...(password ? { password } : {}) })
      : this.users.createUser({ name: name.trim(), email, password, roleId });

    request$
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (saved) => this.dialogRef.close(saved),
        error: (err: unknown) => this.error.set(errorTranslationKey(err)),
      });
  }
}
