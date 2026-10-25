import 'express';
import type { Permission } from '@erp/shared';

declare module 'express-serve-static-core' {
  interface Request {
    /** Values parsed and typed by the `validate` middleware. */
    validated?: {
      body?: unknown;
      query?: unknown;
      params?: unknown;
    };
    /** Set by the `authenticate` middleware. */
    auth?: {
      userId: string;
      tenantId: string;
      roleId: string;
      permissions: Set<Permission>;
    };
  }
}
