export interface DataTableColumn<T> {
  /** Unique key; also the sort field sent to the API when `sortable`. */
  key: string;
  /** Translation key for the header. */
  header: string;
  sortable?: boolean;
  /** Plain value accessor. Ignore when a custom cell template (appCell) is provided. */
  value?: (row: T) => string | number | null | undefined;
  /** Loading placeholder shape. Default: two lines for the first column, pill for status, bar otherwise. */
  skeleton?: 'avatar' | 'lines' | 'pill' | 'bar';
  /** Tailwind classes for the cell, e.g. 'text-end'. */
  cellClass?: string;
}

export interface DataTableQuery {
  page: number;
  limit: number;
  search?: string;
  sort?: string;
}
