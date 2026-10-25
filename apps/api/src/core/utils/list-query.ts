import { z } from 'zod';
import { LIST_DEFAULTS, type PaginationMeta } from '@erp/shared';

export type SortOrder = 1 | -1;

export interface ListQueryOptions {
  /** Fields the client may sort by. */
  sortable: readonly string[];
  /** Fields matched (case-insensitive) by `search`. */
  searchable?: readonly string[];
  /** Exact-match filters the client may pass as query params. */
  filterable?: readonly string[];
  defaultSort?: string;
}

export interface ParsedListQuery {
  page: number;
  limit: number;
  skip: number;
  sort: Record<string, SortOrder>;
  filter: Record<string, unknown>;
}

const baseSchema = z.object({
  page: z.coerce.number().int().min(1).default(LIST_DEFAULTS.page),
  limit: z.coerce.number().int().min(1).max(LIST_DEFAULTS.maxLimit).default(LIST_DEFAULTS.limit),
  search: z.string().trim().max(100).optional(),
  sort: z.string().trim().optional(),
});

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseSort(sort: string | undefined, options: ListQueryOptions): Record<string, SortOrder> {
  const result: Record<string, SortOrder> = {};
  const source = sort || options.defaultSort || '-createdAt';

  for (const raw of source.split(',')) {
    const token = raw.trim();
    if (!token) continue;
    const desc = token.startsWith('-');
    const field = desc ? token.slice(1) : token;
    if (options.sortable.includes(field)) result[field] = desc ? -1 : 1;
  }

  // Stable fallback so pagination never repeats/skips documents.
  if (!('_id' in result)) result['_id'] = -1;
  return result;
}

/**
 * Converts raw query params into a safe Mongo filter/sort/pagination object.
 * Only whitelisted fields are used, so clients cannot inject operators or sort by hidden fields.
 */
export function parseListQuery(
  rawQuery: Record<string, unknown>,
  options: ListQueryOptions,
): ParsedListQuery {
  const { page, limit, search, sort } = baseSchema.parse(rawQuery);
  const filter: Record<string, unknown> = {};

  for (const field of options.filterable ?? []) {
    const value = rawQuery[field];
    if (typeof value === 'string' && value.length > 0) filter[field] = value;
  }

  if (search && options.searchable?.length) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter['$or'] = options.searchable.map((field) => ({ [field]: regex }));
  }

  return { page, limit, skip: (page - 1) * limit, sort: parseSort(sort, options), filter };
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
