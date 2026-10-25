import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';

/** Top-of-screen feedback alerts (saved, deleted, copied, errors). Takes translation keys. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly messages = inject(MessageService);
  private readonly translate = inject(TranslateService);

  success(messageKey: string, params?: Record<string, unknown>): void {
    this.messages.add({ severity: 'success', summary: this.translate.instant(messageKey, params), life: 3000 });
  }

  error(messageKey: string, params?: Record<string, unknown>): void {
    this.messages.add({ severity: 'error', summary: this.translate.instant(messageKey, params), life: 5000 });
  }
}
