import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, type OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { catchError, finalize, of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { errorTranslationKey } from '../../../core/http/api-error';
import { ToastService } from '../../../core/ui/toast.service';
import { addDays, toIsoDate } from '../../../core/utils/date';
import { ErrorBanner } from '../../../shared/components/error-banner/error-banner';
import { Field } from '../../../shared/components/field/field';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { RemoteAutocomplete } from '../../../shared/components/remote-autocomplete/remote-autocomplete';
import { Skeleton } from '../../../shared/components/skeleton/skeleton';
import { LookupService } from '../../../shared/lookups/lookup.service';
import { DocumentApi } from '../document-api';
import { createLinesArray, toLineInputs } from '../document-form';
import { DOCUMENT_KINDS, type DocumentKind } from '../document-kinds';
import { LinesEditor } from '../lines-editor/lines-editor';

/**
 * Create / edit page shared by invoices, quotations and purchase orders.
 * Route: `{ path: 'new' | ':id/edit', data: { kind: 'invoice' } }` (kind & id come in as inputs).
 */
@Component({
  selector: 'app-document-editor-page',
  imports: [ReactiveFormsModule, ButtonModule, DatePickerModule, SelectModule, TextareaModule, TranslatePipe, ErrorBanner, Field, PageHeader, RemoteAutocomplete, Skeleton, LinesEditor],
  templateUrl: './document-editor-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentEditorPage implements OnInit {
  readonly kind = input.required<DocumentKind>();
  readonly id = input<string>();

  private readonly api = inject(DocumentApi);
  private readonly lookups = inject(LookupService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);

  protected readonly config = computed(() => DOCUMENT_KINDS[this.kind()]);
  protected readonly isEdit = computed(() => !!this.id());
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly partyLabel = signal('');

  protected readonly warehouses = toSignal(this.lookups.getActiveWarehouses().pipe(catchError(() => of([]))), {
    initialValue: [],
  });
  /** Invoices may leave the warehouse empty (= default warehouse). */
  protected readonly warehouseOptions = computed(() =>
    this.config().warehouse === 'optional'
      ? [{ _id: null as string | null, name: this.translate.instant('documents.defaultWarehouse') as string }, ...this.warehouses()]
      : this.warehouses(),
  );

  protected readonly form = new FormGroup({
    partyId: new FormControl<string | null>(null, Validators.required),
    date: new FormControl<Date | null>(null),
    warehouseId: new FormControl<string | null>(null),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
    lines: createLinesArray(),
  });

  protected readonly searchParty = computed(() =>
    this.config().party === 'supplier' ? this.lookups.searchSuppliers : this.lookups.searchCustomers,
  );

  protected readonly showSaveAction = computed(() => {
    const action = this.config().saveAndAction;
    return !!action && !!this.auth.user() && this.auth.hasPermission(action.permission);
  });

  constructor() {
    // Default warehouse for new documents that need one.
    effect(() => {
      const first = this.warehouses()[0];
      if (first && !this.isEdit() && this.config().warehouse === 'required' && !this.form.controls.warehouseId.value) {
        this.form.controls.warehouseId.setValue(first._id);
      }
    });
  }

  ngOnInit(): void {
    const config = this.config();
    this.form.controls.date.setValidators(config.dateRequired ? Validators.required : []);
    this.form.controls.warehouseId.setValidators(config.warehouse === 'required' ? Validators.required : []);
    this.form.setControl('lines', createLinesArray([], config.priceMode === 'purchase'));

    const id = this.id();
    if (!id) {
      this.form.controls.date.setValue(addDays(new Date(), config.defaultDays));
      return;
    }

    this.loading.set(true);
    this.api
      .getDocumentById(config.kind, id)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (doc) => {
          if (!doc.canEdit) {
            this.toast.error('documents.notEditable');
            void this.router.navigate([config.baseRoute, id]);
            return;
          }
          this.partyLabel.set(doc.partyName);
          this.form.setControl('lines', createLinesArray(doc.lines, config.priceMode === 'purchase'));
          this.form.patchValue({
            partyId: doc.partyId,
            date: doc.date ? new Date(doc.date) : null,
            warehouseId: doc.warehouseId ?? null,
            notes: doc.notes ?? '',
          });
        },
        error: (err: unknown) => this.error.set(errorTranslationKey(err)),
      });
  }

  protected save(runAction = false): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('documents.fixErrors');
      return;
    }
    const config = this.config();
    const v = this.form.getRawValue();
    const draft = {
      partyId: v.partyId!,
      date: v.date ? toIsoDate(v.date) : undefined,
      warehouseId: v.warehouseId ?? undefined,
      notes: v.notes.trim() || undefined,
      lines: toLineInputs(this.form.controls.lines),
    };

    this.saving.set(true);
    this.error.set(null);
    this.api
      .saveDocument(config.kind, draft, this.id())
      .pipe(
        switchMap((id) =>
          !runAction
            ? of({ id, actionError: null as unknown })
            : this.api.runSaveAction(config.kind, id).pipe(
                switchMap(() => of({ id, actionError: null as unknown })),
                // Saved as draft, but the follow-up (e.g. issue) failed: still go to the document.
                catchError((actionError: unknown) => of({ id, actionError })),
              ),
        ),
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ id, actionError }) => {
          if (actionError) this.toast.error(errorTranslationKey(actionError));
          else this.toast.success(this.isEdit() ? 'common.updated' : 'common.created');
          void this.router.navigate([config.baseRoute, id]);
        },
        error: (err: unknown) => this.error.set(errorTranslationKey(err)),
      });
  }
}
