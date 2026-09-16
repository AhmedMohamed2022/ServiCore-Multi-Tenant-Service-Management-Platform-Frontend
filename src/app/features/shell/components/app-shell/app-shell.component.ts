import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { map } from 'rxjs';

import { AuthService } from '../../../../core/auth/services/auth.service';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { TenantSwitcherComponent } from '../tenant-switcher/tenant-switcher/tenant-switcher.component';
import { NotificationTrayComponent } from '../notification-tray/notification-tray.component';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';

interface NavItem {
  label: string;
  icon: string;
  link: string;
  exact?: boolean;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
  /** Gate name resolved against PermissionsService. */
  requires?: 'manage' | 'reports';
  collapsible?: boolean;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatMenuModule,
    MatTooltipModule,
    TenantSwitcherComponent,
    NotificationTrayComponent,
    AvatarComponent,
    IconComponent,
  ],
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.css'],
})
export class AppShellComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly permissions = inject(PermissionsService);
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly userEmail = computed(() => this.authService.currentUser()?.email ?? '');
  readonly userId = computed(() => this.authService.currentUser()?.userId ?? '');

  /** Below `lg` the sidebar becomes an overlay drawer instead of a column. */
  readonly isHandset = toSignal(
    this.breakpointObserver
      .observe([Breakpoints.XSmall, Breakpoints.Small, Breakpoints.Medium])
      .pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  readonly isDrawerOpen = signal(false);

  /** Report links are collapsed by default — six links is too many to sit flat. */
  private readonly collapsedGroups = signal<ReadonlySet<string>>(new Set(['reports']));

  private readonly navGroups: NavGroup[] = [
    {
      id: 'workspace',
      label: 'Workspace',
      items: [
        { label: 'Tickets', icon: 'confirmation_number', link: '/app/tickets' },
      ],
    },
    {
      id: 'insights',
      label: 'Insights',
      requires: 'reports',
      items: [{ label: 'Dashboard', icon: 'dashboard', link: '/app/dashboard' }],
    },
    {
      id: 'management',
      label: 'Management',
      requires: 'manage',
      items: [
        { label: 'Customers', icon: 'groups', link: '/app/management/customers' },
        { label: 'Teams', icon: 'diversity_3', link: '/app/management/teams' },
        { label: 'Categories', icon: 'sell', link: '/app/management/categories' },
        { label: 'Invitations', icon: 'mail', link: '/app/management/invitations' },
      ],
    },
    {
      id: 'reports',
      label: 'Reports',
      requires: 'reports',
      collapsible: true,
      items: [
        { label: 'Ticket statistics', icon: 'monitoring', link: '/app/reports/tickets' },
        { label: 'Volume over time', icon: 'timeline', link: '/app/reports/time-series' },
        { label: 'Team performance', icon: 'workspace_premium', link: '/app/reports/teams' },
        { label: 'Agent workload', icon: 'support_agent', link: '/app/reports/agents' },
        { label: 'Customer volume', icon: 'receipt_long', link: '/app/reports/customers' },
        { label: 'Category breakdown', icon: 'category', link: '/app/reports/categories' },
      ],
    },
  ];

  /**
   * Navigation still respects the user's role exactly as before — the only
   * change is that the answer comes from one cached probe rather than a fresh
   * request per component.
   */
  readonly visibleGroups = computed(() =>
    this.navGroups.filter((group) => {
      if (group.requires === 'manage') return this.permissions.canManage();
      if (group.requires === 'reports') return this.permissions.canViewReports();
      return true;
    }),
  );

  ngOnInit(): void {
    this.permissions.probeAll();
  }

  isCollapsed(groupId: string): boolean {
    return this.collapsedGroups().has(groupId);
  }

  toggleGroup(groupId: string): void {
    const next = new Set(this.collapsedGroups());
    next.has(groupId) ? next.delete(groupId) : next.add(groupId);
    this.collapsedGroups.set(next);
  }

  toggleDrawer(): void {
    this.isDrawerOpen.update((open) => !open);
  }

  /** On mobile the drawer is an overlay, so following a link must close it. */
  onNavigate(): void {
    if (this.isHandset()) {
      this.isDrawerOpen.set(false);
    }
  }

  onLogoutClick(): void {
    this.authService.logout();
  }
}
