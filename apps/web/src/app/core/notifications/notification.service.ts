import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, effect, inject, Injectable, PLATFORM_ID, signal, untracked } from '@angular/core';
import type { ApiSuccess, NotificationDto, NotificationType, PaginationMeta } from '@erp/shared';
import { catchError, EMPTY, interval, map, type Observable, startWith, type Subscription, switchMap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { API_BASE_URL } from '../config/app.constants';

export type { NotificationType };

export interface AppNotification {
  id: string;
  type: NotificationType;
  /** Translation key + params so the text follows the current language. */
  messageKey: string;
  params?: Record<string, string | number>;
  link?: string;
  createdAt: Date;
  read: boolean;
}

interface NotificationsPage {
  items: AppNotification[];
  unreadCount: number;
}

const NOTIFICATIONS_URL = `${API_BASE_URL}/notifications`;
/** How often the bell is refreshed while the user is signed in. */
const POLL_INTERVAL_MS = 60_000;
const PAGE_SIZE = 20;

function toAppNotification(dto: NotificationDto): AppNotification {
  return {
    id: dto._id,
    type: dto.type,
    messageKey: dto.messageKey,
    params: dto.params,
    link: dto.link,
    createdAt: new Date(dto.createdAt),
    read: !!dto.readAt,
  };
}

/**
 * In-app notifications (bell in the header), backed by /api/v1/notifications.
 * Polls while a user is signed in (browser only); updates are optimistic and
 * re-synced from the server if a request fails.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _items = signal<AppNotification[]>([]);
  private readonly _unreadCount = signal(0);
  private polling: Subscription | null = null;

  readonly items = this._items.asReadonly();
  readonly unreadCount = this._unreadCount.asReadonly();

  constructor() {
    effect(() => {
      const signedIn = this.auth.isAuthenticated();
      untracked(() => (signedIn ? this.startPolling() : this.stopPolling()));
    });
    inject(DestroyRef).onDestroy(() => this.stopPolling());
  }

  getNotifications(): Observable<NotificationsPage> {
    return this.http
      .get<ApiSuccess<NotificationDto[]> & { meta: PaginationMeta & { unreadCount: number } }>(NOTIFICATIONS_URL, {
        params: { page: 1, limit: PAGE_SIZE, sort: '-createdAt' },
      })
      .pipe(map((res) => ({ items: res.data.map(toAppNotification), unreadCount: res.meta.unreadCount })));
  }

  /** Re-fetches now (e.g. after an action that may create a notification). */
  reloadNotifications(): void {
    this.getNotifications()
      .pipe(catchError(() => EMPTY))
      .subscribe((page) => this.setPage(page));
  }

  markNotificationAsRead(id: string): void {
    const target = this._items().find((n) => n.id === id);
    if (!target || target.read) return;
    this._items.update((items) => items.map((n) => (n.id === id ? { ...n, read: true } : n)));
    this._unreadCount.update((c) => Math.max(0, c - 1));
    this.sync(this.http.patch<void>(`${NOTIFICATIONS_URL}/${id}/read`, {}));
  }

  markAllNotificationsAsRead(): void {
    this._items.update((items) => items.map((n) => ({ ...n, read: true })));
    this._unreadCount.set(0);
    this.sync(this.http.patch<void>(`${NOTIFICATIONS_URL}/read-all`, {}));
  }

  removeNotification(id: string): void {
    const target = this._items().find((n) => n.id === id);
    this._items.update((items) => items.filter((n) => n.id !== id));
    if (target && !target.read) this._unreadCount.update((c) => Math.max(0, c - 1));
    this.sync(this.http.delete<void>(`${NOTIFICATIONS_URL}/${id}`));
  }

  private startPolling(): void {
    if (!this.isBrowser || this.polling) return;
    this.polling = interval(POLL_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.getNotifications().pipe(catchError(() => EMPTY))),
      )
      .subscribe((page) => this.setPage(page));
  }

  private stopPolling(): void {
    this.polling?.unsubscribe();
    this.polling = null;
    this._items.set([]);
    this._unreadCount.set(0);
  }

  /** Sends an optimistic change; on failure reloads the real state. */
  private sync(request: Observable<void>): void {
    request.pipe(catchError(() => (this.reloadNotifications(), EMPTY))).subscribe();
  }

  private setPage(page: NotificationsPage): void {
    this._items.set(page.items);
    this._unreadCount.set(page.unreadCount);
  }
}
