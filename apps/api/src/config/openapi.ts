type Method = 'get' | 'post' | 'patch' | 'delete';
type Operation = Record<string, unknown>;

const json = (schema: object) => ({ content: { 'application/json': { schema } } });
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string' } };
const listParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
  { name: 'search', in: 'query', schema: { type: 'string' } },
  { name: 'sort', in: 'query', schema: { type: 'string', example: '-createdAt' } },
];
const ok = { 200: { description: 'OK' } };

function op(tag: string, summary: string, extra: Operation = {}, secured = true): Operation {
  return { tags: [tag], summary, ...(secured ? { security: [{ bearerAuth: [] }] } : {}), responses: ok, ...extra };
}

/** Standard list / get / create / update / delete endpoints of a resource. */
function crud(tag: string, path: string, singular: string, withDelete = true): Record<string, Partial<Record<Method, Operation>>> {
  const body = { requestBody: { required: true, ...json({ type: 'object' }) } };
  return {
    [path]: {
      get: op(tag, `List ${tag.toLowerCase()}`, { parameters: listParams }),
      post: op(tag, `Create ${singular}`, { ...body, responses: { 201: { description: 'Created' } } }),
    },
    [`${path}/{id}`]: {
      get: op(tag, `Get ${singular}`, { parameters: [idParam] }),
      patch: op(tag, `Update ${singular}`, { parameters: [idParam], ...body }),
      ...(withDelete ? { delete: op(tag, `Delete ${singular}`, { parameters: [idParam], responses: { 204: { description: 'Deleted' } } }) } : {}),
    },
  };
}

/** Marks a document action such as POST /invoices/{id}/issue. */
function action(tag: string, path: string, summary: string): Record<string, Partial<Record<Method, Operation>>> {
  return { [path]: { post: op(tag, summary, { parameters: [idParam] }) } };
}

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Smart ERP API',
    version: '1.0.0',
    description:
      'Click **Authorize** and paste the `accessToken` returned by `POST /auth/login`. Successful responses are `{ success: true, data }`.',
  },
  servers: [{ url: '/api/v1' }],
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  paths: {
    '/health': { get: op('Health', 'API status', {}, false) },
    '/auth/login': {
      post: op(
        'Auth',
        'Log in and get an access token',
        {
          requestBody: {
            required: true,
            ...json({
              type: 'object',
              required: ['email', 'password'],
              properties: { email: { type: 'string', example: 'admin@example.com' }, password: { type: 'string' } },
            }),
          },
        },
        false,
      ),
    },
    '/auth/me': { get: op('Auth', 'Current user, role and permissions') },

    '/users': {
      get: op('Users', 'List users (SuperAdmin)', { parameters: listParams }),
      post: op('Users', 'Create a user', {
        requestBody: {
          required: true,
          ...json({
            type: 'object',
            required: ['name', 'email', 'password', 'roleId'],
            properties: { name: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' }, roleId: { type: 'string' } },
          }),
        },
        responses: { 201: { description: 'Created' } },
      }),
    },
    '/users/roles': { get: op('Users', 'List roles to pick from') },
    '/users/{id}': {
      patch: op('Users', 'Update name, role, active flag or reset the password', {
        parameters: [idParam],
        requestBody: { required: true, ...json({ type: 'object' }) },
      }),
      delete: op('Users', 'Delete a user', { parameters: [idParam], responses: { 204: { description: 'Deleted' } } }),
    },

    ...crud('Customers', '/customers', 'customer'),
    ...crud('Quotations', '/quotations', 'quotation'),
    ...action('Quotations', '/quotations/{id}/send', 'Mark as sent'),
    ...action('Quotations', '/quotations/{id}/accept', 'Mark as accepted'),
    ...action('Quotations', '/quotations/{id}/reject', 'Mark as rejected'),
    ...crud('Invoices', '/invoices', 'invoice'),
    ...action('Invoices', '/invoices/{id}/issue', 'Issue the invoice'),
    '/payments': {
      get: op('Payments', 'List payments', { parameters: listParams }),
      post: op('Payments', 'Record a payment', { requestBody: { required: true, ...json({ type: 'object' }) }, responses: { 201: { description: 'Created' } } }),
    },
    '/payments/{id}': { get: op('Payments', 'Get payment', { parameters: [idParam] }) },

    ...crud('Products', '/products', 'product'),
    ...crud('Warehouses', '/warehouses', 'warehouse'),
    '/stock/levels': { get: op('Stock', 'Stock level per product and warehouse', { parameters: listParams }) },
    '/stock/movements': { get: op('Stock', 'Stock movement ledger', { parameters: listParams }) },
    '/stock/adjustments': { post: op('Stock', 'Adjust stock', { requestBody: { required: true, ...json({ type: 'object' }) } }) },
    '/stock/transfers': { post: op('Stock', 'Transfer stock between warehouses', { requestBody: { required: true, ...json({ type: 'object' }) } }) },

    ...crud('Suppliers', '/suppliers', 'supplier'),
    ...crud('Purchase Orders', '/purchase-orders', 'purchase order'),
    ...action('Purchase Orders', '/purchase-orders/{id}/send', 'Send to the supplier'),
    ...action('Purchase Orders', '/purchase-orders/{id}/cancel', 'Cancel'),

    '/notifications': { get: op('Notifications', 'List notifications', { parameters: listParams }) },
    '/notifications/unread-count': { get: op('Notifications', 'Unread count') },
    '/notifications/read-all': { patch: op('Notifications', 'Mark all as read') },
    '/notifications/{id}/read': { patch: op('Notifications', 'Mark one as read', { parameters: [idParam] }) },
  },
};
