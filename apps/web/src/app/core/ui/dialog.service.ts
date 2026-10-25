import type { Type } from '@angular/core';
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DialogService as PrimeDialogService } from 'primeng/dynamicdialog';
import { EMPTY, filter, map, type Observable } from 'rxjs';
import { ConfirmDialog, type ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog';
import { PromptDialog, type PromptDialogData } from '../../shared/components/prompt-dialog/prompt-dialog';

export interface OpenDialogOptions<D> {
  /** Translation key for the dialog title. */
  header: string;
  headerParams?: Record<string, unknown>;
  data?: D;
  /** CSS width on desktop; dialogs are full-width on phones. */
  width?: string;
}

/**
 * Opens PrimeNG dynamic dialogs with the app defaults (modal, translated header, responsive width).
 * Components read `data` with `inject(DynamicDialogConfig).data` and close with `inject(DynamicDialogRef).close(result)`.
 */
@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly dialogs = inject(PrimeDialogService);
  private readonly translate = inject(TranslateService);

  open<C, D = unknown, R = unknown>(component: Type<C>, options: OpenDialogOptions<D>): Observable<R | undefined> {
    const ref = this.dialogs.open(component, {
      header: this.translate.instant(options.header, options.headerParams),
      data: options.data,
      modal: true,
      closable: true,
      closeOnEscape: true,
      dismissableMask: false,
      focusOnShow: true,
      width: options.width ?? '560px',
      breakpoints: { '640px': '95vw' },
      contentStyle: { overflow: 'visible' },
    });
    return ref ? (ref.onClose as Observable<R | undefined>) : EMPTY;
  }

  /** Emits true only when the user confirms. */
  confirm(data: ConfirmDialogData): Observable<boolean> {
    return this.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      header: data.titleKey,
      headerParams: data.params,
      data,
      width: '440px',
    }).pipe(map((result) => result === true));
  }

  /** Emits the entered text only when the user confirms. */
  prompt(data: PromptDialogData): Observable<string> {
    return this.open<PromptDialog, PromptDialogData, string>(PromptDialog, {
      header: data.titleKey,
      headerParams: data.params,
      data,
      width: '480px',
    }).pipe(filter((value): value is string => !!value));
  }
}
