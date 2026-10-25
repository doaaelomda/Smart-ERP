import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TextareaModule } from 'primeng/textarea';
import { Field } from '../field/field';

export interface PromptDialogData {
  titleKey: string;
  messageKey?: string;
  params?: Record<string, unknown>;
  labelKey: string;
  confirmKey?: string;
  minLength?: number;
  danger?: boolean;
}

/** Asks for one line of text (e.g. a cancellation reason). Open it through `DialogService.prompt()`. */
@Component({
  selector: 'app-prompt-dialog',
  imports: [ReactiveFormsModule, ButtonModule, TextareaModule, TranslatePipe, Field],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="flex flex-col gap-4">
      @if (data.messageKey) {
        <p class="m-0 text-body text-muted">{{ data.messageKey | translate: data.params }}</p>
      }
      <app-field [label]="data.labelKey" for="prompt-text" [control]="text">
        <textarea pTextarea id="prompt-text" rows="3" [formControl]="text" class="w-full" [autofocus]="true"></textarea>
      </app-field>
      <div class="flex justify-end gap-2">
        <p-button type="button" [label]="'common.cancel' | translate" severity="secondary" [text]="true" (onClick)="ref.close()" />
        <p-button type="submit" [label]="(data.confirmKey ?? 'common.confirm') | translate" [severity]="data.danger ? 'danger' : 'primary'" />
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromptDialog {
  protected readonly ref = inject(DynamicDialogRef);
  protected readonly data = inject<DynamicDialogConfig<PromptDialogData>>(DynamicDialogConfig).data!;
  protected readonly text = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(this.data.minLength ?? 1), Validators.maxLength(300)],
  });
  protected readonly form = new FormGroup({ text: this.text });

  protected submit(): void {
    if (this.text.invalid) {
      this.text.markAsTouched();
      return;
    }
    this.ref.close(this.text.value.trim());
  }
}
