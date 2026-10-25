import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from './notification.service';

const page = {
  success: true,
  data: [
    { _id: 'a', type: 'system', messageKey: 'notifications.welcome', readAt: null, createdAt: '2026-10-25T08:00:00Z' },
    { _id: 'b', type: 'lowStock', messageKey: 'notifications.lowStock', readAt: '2026-10-25T09:00:00Z', createdAt: '2026-10-25T07:00:00Z' },
  ],
  meta: { page: 1, limit: 20, total: 2, totalPages: 1, unreadCount: 1 },
};

describe('NotificationService', () => {
  const signedIn = signal(true);
  let service: NotificationService;
  let http: HttpTestingController;

  beforeEach(() => {
    signedIn.set(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { isAuthenticated: signedIn } },
      ],
    });
    service = TestBed.inject(NotificationService);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    http.expectOne((r) => r.url === '/api/v1/notifications').flush(page);
  });

  afterEach(() => http.verify());

  it('loads notifications from the API when signed in', () => {
    expect(service.items().map((n) => [n.id, n.read])).toEqual([
      ['a', false],
      ['b', true],
    ]);
    expect(service.items()[0]!.createdAt).toBeInstanceOf(Date);
    expect(service.unreadCount()).toBe(1);
  });

  it('marks as read optimistically and calls the API', () => {
    service.markNotificationAsRead('a');
    expect(service.unreadCount()).toBe(0);
    const req = http.expectOne('/api/v1/notifications/a/read');
    expect(req.request.method).toBe('PATCH');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('reloads the real state when an update fails', () => {
    service.markAllNotificationsAsRead();
    expect(service.unreadCount()).toBe(0);
    http.expectOne('/api/v1/notifications/read-all').flush(null, { status: 500, statusText: 'Error' });
    http.expectOne((r) => r.url === '/api/v1/notifications').flush(page);
    expect(service.unreadCount()).toBe(1);
  });

  it('clears everything on sign out', () => {
    signedIn.set(false);
    TestBed.tick();
    expect(service.items()).toEqual([]);
    expect(service.unreadCount()).toBe(0);
  });
});
