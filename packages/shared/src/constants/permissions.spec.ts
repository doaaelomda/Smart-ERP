import { describe, expect, it } from 'vitest';
import { ALL_PERMISSIONS } from './permissions.js';

describe('permissions', () => {
  it('builds unique module.action keys', () => {
    expect(ALL_PERMISSIONS).toContain('invoices.issue');
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
    expect(ALL_PERMISSIONS.every((p) => /^[a-zA-Z]+\.[a-z]+$/.test(p))).toBe(true);
  });
});
