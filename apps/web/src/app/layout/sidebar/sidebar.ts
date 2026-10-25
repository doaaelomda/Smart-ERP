import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { Logo } from '../../shared/components/logo/logo';
import { NAV_GROUPS } from './nav-items';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, TranslatePipe, Logo],
  templateUrl: './sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  readonly navigate = output<void>();
  private readonly auth = inject(AuthService);

  /** Only links the user has permission for; empty groups are hidden. */
  protected readonly groups = computed(() => {
    this.auth.user(); // recompute when the session changes
    return NAV_GROUPS.map((group) => ({
      ...group,
      links: group.links.filter((l) => !l.permission || this.auth.hasPermission(l.permission)),
    })).filter((group) => group.links.length > 0);
  });
}
