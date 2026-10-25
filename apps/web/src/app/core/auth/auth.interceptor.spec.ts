import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { AuthSession } from '@erp/shared';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

const session = (token: string): { success: true; data: AuthSession } => ({
  success: true,
  data: {
    accessToken: token,
    expiresIn: 900,
    user: {
      id: 'u1', name: 'Doaa', email: 'd@x.com', language: 'ar',
      role: { id: 'r1', name: 'Owner' }, permissions: ['invoices.view'],
      tenant: { id: 't1', name: 'Nile', currency: 'EGP', vatRate: 14 },
    },
  },
});

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => backend.verify());

  function signIn(token = 'old-token') {
    auth.login({ email: 'd@x.com', password: 'secret123' }).subscribe();
    backend.expectOne('/api/v1/auth/login').flush(session(token));
  }

  it('adds the bearer token to API calls but not to external URLs', () => {
    signIn();
    http.get('/api/v1/customers').subscribe();
    http.get('https://example.com/data').subscribe();

    expect(backend.expectOne('/api/v1/customers').request.headers.get('Authorization')).toBe('Bearer old-token');
    expect(backend.expectOne('https://example.com/data').request.headers.has('Authorization')).toBe(false);
  });

  it('refreshes once on 401 for parallel requests and retries them with the new token', () => {
    signIn();
    const results: unknown[] = [];
    http.get('/api/v1/a').subscribe((r) => results.push(r));
    http.get('/api/v1/b').subscribe((r) => results.push(r));

    backend.expectOne('/api/v1/a').flush(null, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne('/api/v1/b').flush(null, { status: 401, statusText: 'Unauthorized' });

    // Only ONE refresh request for both failures.
    backend.expectOne('/api/v1/auth/refresh').flush(session('new-token'));

    const retries = backend.match((r) => r.url === '/api/v1/a' || r.url === '/api/v1/b');
    expect(retries).toHaveLength(2);
    retries.forEach((r) => {
      expect(r.request.headers.get('Authorization')).toBe('Bearer new-token');
      r.flush({ ok: true });
    });
    expect(results).toHaveLength(2);
  });

  it('ends the session and goes to login when refresh fails', () => {
    signIn();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    http.get('/api/v1/a').subscribe({ error: () => undefined });

    backend.expectOne('/api/v1/a').flush(null, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne('/api/v1/auth/refresh').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/auth/login'], expect.anything());
  });

  it('exposes permissions from the session', () => {
    signIn();
    expect(auth.hasPermission('invoices.view')).toBe(true);
    expect(auth.hasPermission('invoices.issue')).toBe(false);
  });
});
