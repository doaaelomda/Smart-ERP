import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { buildPaginationMeta, parseListQuery } from './list-query.js';

const options = {
  sortable: ['name', 'createdAt'],
  searchable: ['name', 'email'],
  filterable: ['status'],
} as const;

describe('parseListQuery', () => {
  it('applies defaults', () => {
    const q = parseListQuery({}, options);
    expect(q).toMatchObject({ page: 1, limit: 20, skip: 0 });
    expect(q.sort).toEqual({ createdAt: -1, _id: -1 });
    expect(q.filter).toEqual({});
  });

  it('parses pagination and multi-field sort', () => {
    const q = parseListQuery({ page: '3', limit: '10', sort: '-name,createdAt' }, options);
    expect(q.skip).toBe(20);
    expect(q.sort).toEqual({ name: -1, createdAt: 1, _id: -1 });
  });

  it('ignores non-whitelisted sort and filter fields', () => {
    const q = parseListQuery({ sort: 'passwordHash', status: 'issued', role: 'admin' }, options);
    expect(q.sort).toEqual({ _id: -1 });
    expect(q.filter).toEqual({ status: 'issued' });
  });

  it('ignores operator injection in filters', () => {
    const q = parseListQuery({ status: { $ne: 'x' } }, options);
    expect(q.filter).toEqual({});
  });

  it('builds escaped case-insensitive search', () => {
    const q = parseListQuery({ search: 'a.b(' }, options);
    const or = q.filter['$or'] as Record<string, RegExp>[];
    expect(or).toHaveLength(2);
    expect(or[0]!['name']!.test('A.B(')).toBe(true);
    expect(or[0]!['name']!.test('axb(')).toBe(false);
  });

  it('rejects limit above max', () => {
    expect(() => parseListQuery({ limit: '1000' }, options)).toThrow(ZodError);
  });
});

describe('buildPaginationMeta', () => {
  it('computes total pages', () => {
    expect(buildPaginationMeta(45, 2, 20)).toEqual({ page: 2, limit: 20, total: 45, totalPages: 3 });
  });
});
