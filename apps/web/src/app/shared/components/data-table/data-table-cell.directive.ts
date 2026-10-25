import { Directive, inject, input, TemplateRef } from '@angular/core';

/**
 * Custom cell template for a column.
 * <ng-template appCell="status" let-row> <app-status-badge [status]="row.status" /> </ng-template>
 */
@Directive({ selector: 'ng-template[appCell]' })
export class DataTableCell {
  readonly column = input.required<string>({ alias: 'appCell' });
  readonly template = inject<TemplateRef<{ $implicit: unknown }>>(TemplateRef);
}
