import { DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, EMPTY, type Observable, switchMap, tap } from 'rxjs';
import type { DataTableQuery } from '../../shared/components/data-table/data-table.types';
import { errorTranslationKey } from './api-error';
import type { Page, QueryParams } from './list-params';

/**
 * State for a server-side list page (table query + filters → API → rows).
 * Call from an injection context (field initializer / constructor):
 *   protected readonly list = createListState((q) => this.products.getProducts(q), { sort: 'name' });
 * Changing `query` or `filters`, or calling `reload()`, re-fetches; older requests are cancelled.
 */
export function createListState<T>(
  fetch: (query: QueryParams) => Observable<Page<T>>,
  initial: Partial<DataTableQuery> = {},
  initialFilters: QueryParams = {},
) {
  const query = signal<DataTableQuery>({ page: 1, limit: 20, ...initial });
  const filters = signal<QueryParams>(initialFilters);
  const reloadTick = signal(0);
  const items = signal<T[]>([]);
  const total = signal(0);
  const loading = signal(true);
  const error = signal<string | null>(null);

  combineLatest([toObservable(query), toObservable(filters), toObservable(reloadTick)])
    .pipe(
      tap(() => {
        loading.set(true);
        error.set(null);
      }),
      switchMap(([q, f]) =>
        fetch({ ...f, ...q }).pipe(
          catchError((err: unknown) => {
            error.set(errorTranslationKey(err));
            items.set([]);
            total.set(0);
            loading.set(false);
            return EMPTY;
          }),
        ),
      ),
      takeUntilDestroyed(inject(DestroyRef)),
    )
    .subscribe((page) => {
      items.set(page.items);
      total.set(page.meta.total);
      loading.set(false);
    });

  return {
    query,
    filters,
    items: items.asReadonly(),
    total: total.asReadonly(),
    loading: loading.asReadonly(),
    error: error.asReadonly(),
    reload: () => reloadTick.update((n) => n + 1),
    /** Merge filters and go back to page 1. */
    setFilters: (patch: QueryParams) => {
      filters.update((f) => ({ ...f, ...patch }));
      query.update((q) => ({ ...q, page: 1 }));
    },
    /** After deleting a row: step back a page when it was the last row. */
    afterDelete: () => {
      if (items().length === 1 && query().page > 1) query.update((q) => ({ ...q, page: q.page - 1 }));
      else reloadTick.update((n) => n + 1);
    },
  };
}

export type ListState<T> = ReturnType<typeof createListState<T>>;
