import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import type { Permission } from '@erp/shared';
import { AuthService } from './auth.service';

/**
 * Renders the element only when the user has the permission.
 * <button *appHasPermission="'invoices.create'">…</button>
 * The backend still enforces every permission; this only hides UI.
 */
@Directive({ selector: '[appHasPermission]' })
export class HasPermission {
  readonly permission = input.required<Permission>({ alias: 'appHasPermission' });

  private readonly auth = inject(AuthService);
  private readonly template = inject(TemplateRef);
  private readonly container = inject(ViewContainerRef);
  private rendered = false;

  constructor() {
    effect(() => {
      const allowed = this.auth.user() !== null && this.auth.hasPermission(this.permission());
      if (allowed && !this.rendered) {
        this.container.createEmbeddedView(this.template);
        this.rendered = true;
      } else if (!allowed && this.rendered) {
        this.container.clear();
        this.rendered = false;
      }
    });
  }
}
