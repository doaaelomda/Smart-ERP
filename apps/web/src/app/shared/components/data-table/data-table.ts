import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, contentChildren, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule, type PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
import { Skeleton } from '../skeleton/skeleton';
import { DataTableCell } from './data-table-cell.directive';
import type { DataTableColumn, DataTableQuery } from './data-table.types';

interface SkeletonCell {
  kind: 'avatar' | 'lines' | 'pill' | 'actions' | 'bar';
  width?: string;
  end?: boolean;
}

const SKELETON_WIDTHS = ['70%', '55%', '80%', '45%', '62%'];

/**
 * Shared server-side table (PrimeNG p-table, lazy): search (debounced), sort and pagination
 * are emitted as one `queryChange`, so every list page talks to the API the same way.
 */
@Component({
  selector: 'app-data-table',
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    TableModule,
    PaginatorModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    TranslatePipe,
    Skeleton,
  ],
  templateUrl: './data-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTable<T> {
  readonly columns = input.required<DataTableColumn<T>[]>();
  readonly data = input<T[]>([]);
  readonly total = input(0);
  readonly loading = input(false);
  readonly query = input<DataTableQuery>({ page: 1, limit: 20 });
  readonly searchable = input(true);
  readonly pageSizeOptions = input([10, 20, 50, 100]);
  readonly queryChange = output<DataTableQuery>();

  private readonly cellTemplates = contentChildren(DataTableCell);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly templates = computed(() => new Map(this.cellTemplates().map((t) => [t.column(), t.template])));
  /** Placeholder rows while loading: as many as a page shows (max 8) so the table doesn't jump. */
  protected readonly skeletonRows = computed(() =>
    Array.from({ length: Math.min(this.query().limit, 8) }, (_, i) => ({ __skeleton: i })),
  );
  protected readonly rows = computed<unknown[]>(() => (this.loading() ? this.skeletonRows() : this.data()));
  protected readonly first = computed(() => (this.query().page - 1) * this.query().limit);

  protected readonly activeSort = computed(() => {
    const sort = this.query().sort;
    if (!sort) return { field: null, order: 1 };
    const desc = sort.startsWith('-');
    return { field: desc ? sort.slice(1) : sort, order: desc ? -1 : 1 };
  });

  constructor() {
    this.searchControl.valueChanges
      .pipe(
        map((v) => v.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((search) => this.emit({ search: search || undefined, page: 1 }));
  }

  /** asc → desc → asc on the same column; a new column starts ascending. */
  protected toggleSort(field: string): void {
    const { field: current, order } = this.activeSort();
    const sort = current === field && order === 1 ? `-${field}` : field;
    this.emit({ sort, page: 1 });
  }

  protected ariaSort(field: string): 'ascending' | 'descending' | 'none' {
    const { field: current, order } = this.activeSort();
    return current !== field ? 'none' : order === 1 ? 'ascending' : 'descending';
  }

  protected onPage(event: PaginatorState): void {
    const limit = event.rows ?? this.query().limit;
    const page = Math.floor((event.first ?? 0) / limit) + 1;
    if (page !== this.query().page || limit !== this.query().limit) this.emit({ page, limit });
  }

  protected cellValue(column: DataTableColumn<T>, row: T): string | number {
    const value = column.value ? column.value(row) : (row as Record<string, unknown>)[column.key];
    return value === null || value === undefined || value === '' ? '—' : (value as string | number);
  }

  /**
   * Skeleton that looks like the real cell: two lines for the main (first) column, a pill for
   * status columns, round buttons for actions, end-aligned bars for numbers, varied widths elsewhere.
   */
  protected skeletonFor(column: DataTableColumn<T>, columnIndex: number, row: unknown): SkeletonCell {
    const rowIndex = (row as { __skeleton?: number }).__skeleton ?? 0;
    const width = SKELETON_WIDTHS[(rowIndex + columnIndex) % SKELETON_WIDTHS.length]!;
    if (column.key === 'actions') return { kind: 'actions' };
    if (column.skeleton === 'avatar') return { kind: 'avatar', width };
    if (column.skeleton === 'lines' || (!column.skeleton && columnIndex === 0)) return { kind: 'lines', width };
    if (column.skeleton === 'pill' || (!column.skeleton && /status|isActive/i.test(column.key))) return { kind: 'pill' };
    const end = (column.cellClass ?? '').includes('text-end');
    return { kind: 'bar', width: end ? '55%' : width, end };
  }

  protected asRow(row: unknown): T {
    return row as T;
  }

  private emit(patch: Partial<DataTableQuery>): void {
    this.queryChange.emit({ ...this.query(), ...patch });
  }
}
