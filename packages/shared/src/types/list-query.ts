/** Standard list query used by every list endpoint and the shared data table. */
export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
  /** Comma separated fields, prefix with `-` for descending. e.g. `-createdAt,name` */
  sort?: string;
  [filter: string]: string | number | boolean | undefined;
}

export const LIST_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
} as const;
