import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { PopoverModule } from 'primeng/popover';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { NotificationService, type AppNotification } from '../../core/notifications/notification.service';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { NAV_GROUPS, type NavLink } from '../sidebar/nav-items';

const NOTIFICATION_STYLE: Record<AppNotification['type'], { icon: string; tile: string }> = {
  lowStock: { icon: 'inventory', tile: 'bg-warning-soft text-warning' },
  overdue: { icon: 'receipt_long', tile: 'bg-danger-soft text-danger' },
  latePo: { icon: 'local_shipping', tile: 'bg-info-soft text-info' },
  system: { icon: 'campaign', tile: 'bg-violet-soft text-violet' },
};

@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    FormsModule,
    AutoCompleteModule,
    ButtonModule,
    DividerModule,
    OverlayBadgeModule,
    PopoverModule,
    TagModule,
    TooltipModule,
    TranslatePipe,
    ThemeToggle,
    TimeAgoPipe,
  ],
  // Sticky on the host: a sticky element only sticks inside its parent, and the host is the header's parent.
  host: { class: 'sticky top-0 z-10 block' },
  templateUrl: './header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  readonly menuToggle = output<void>();

  protected readonly language = inject(LanguageService);
  protected readonly auth = inject(AuthService);
  protected readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  protected readonly notificationStyle = NOTIFICATION_STYLE;

  protected readonly initials = computed(() => {
    const name = this.auth.user()?.name ?? '';
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join('');
  });

  /** Quick navigation: search the pages the user is allowed to open. */
  protected readonly searchTerm = signal('');
  private readonly allowedLinks = computed(() =>
    NAV_GROUPS.flatMap((g) => g.links).filter((l) => !l.permission || this.auth.hasPermission(l.permission)),
  );
  protected searchValue: (NavLink & { labelText: string }) | string | null = null;
  protected readonly searchResults = computed(() => {
    this.language.language(); // re-evaluate labels on language change
    const term = this.searchTerm().trim().toLowerCase();
    return this.allowedLinks()
      .map((l) => ({ ...l, labelText: this.translate.instant(l.label) as string }))
      .filter((l) => !term || l.labelText.toLowerCase().includes(term));
  });

  protected onSearchSelected(link: NavLink): void {
    void this.router.navigateByUrl(link.route);
    this.searchValue = null;
    this.searchTerm.set('');
  }

  protected openNotification(notification: AppNotification): void {
    this.notifications.markNotificationAsRead(notification.id);
    if (notification.link) void this.router.navigateByUrl(notification.link);
  }
}
