import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { viewChild } from '@angular/core';

import { NotificationService } from '../../../../core/services/notification.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import {
  NotificationDto,
  NotificationType,
  NotificationTypeIcons,
  NotificationTypeLabels,
  NotificationTypeTones,
} from '../../../../core/models/notification.model';

import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { EmptyStateComponent } from '../../../../shared/ui/states/states.component';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

/** A notification with its presentation resolved. */
interface TrayItem {
  readonly id: string;
  readonly title: string;
  readonly message: string;
  readonly icon: string;
  readonly toneClass: string;
  readonly typeLabel: string;
  readonly relativeTime: string;
  readonly exactTime: string;
  readonly isRead: boolean;
  readonly ticketId: string | null;
}

/** Notifications bucketed by recency. */
interface TrayGroup {
  readonly key: string;
  readonly label: string;
  readonly items: TrayItem[];
}

@Component({
  selector: 'app-notification-tray',
  standalone: true,
  imports: [MatMenuModule, MatTooltipModule, IconComponent, EmptyStateComponent],
  templateUrl: './notification-tray.component.html',
  styleUrls: ['./notification-tray.component.css'],
})
export class NotificationTrayComponent {
  private readonly notificationService = inject(NotificationService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  private readonly menuTrigger = viewChild(MatMenuTrigger);

  readonly unreadCount = this.notificationService.unreadCount;
  readonly isMarkingAll = signal<boolean>(false);

  /** 'all' or 'unread'. Persisted only for the life of the component. */
  readonly filter = signal<'all' | 'unread'>('all');

  private readonly all = this.notificationService.registryList;

  readonly hasAny = computed(() => this.all().length > 0);

  /**
   * Grouped by recency rather than shown as one flat list. A tray that has
   * accumulated a week of activity is unreadable without this, and the
   * grouping is cheap because every notification carries `createdAt`.
   */
  readonly groups = computed<TrayGroup[]>(() => {
    const wanted = this.filter();
    const items = [...this.all()]
      .filter((n) => wanted === 'all' || !n.isRead)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const buckets: Record<string, TrayItem[]> = {
      today: [],
      yesterday: [],
      earlier: [],
    };

    for (const notification of items) {
      const created = new Date(notification.createdAt);
      const key =
        created >= startOfToday
          ? 'today'
          : created >= startOfYesterday
            ? 'yesterday'
            : 'earlier';
      buckets[key].push(this.toTrayItem(notification));
    }

    return [
      { key: 'today', label: 'Today', items: buckets['today'] },
      { key: 'yesterday', label: 'Yesterday', items: buckets['yesterday'] },
      { key: 'earlier', label: 'Earlier', items: buckets['earlier'] },
    ].filter((group) => group.items.length > 0);
  });

  readonly visibleCount = computed(() =>
    this.groups().reduce((sum, group) => sum + group.items.length, 0),
  );

  private toTrayItem(notification: NotificationDto): TrayItem {
    const type = notification.type ?? NotificationType.TicketStatusChanged;

    return {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      icon: NotificationTypeIcons[type] ?? 'notifications',
      toneClass:
        NotificationTypeTones[type] ?? 'bg-surface-sunken text-ink-muted',
      typeLabel: NotificationTypeLabels[type] ?? 'Update',
      relativeTime: this.relativeTime(notification.createdAt),
      exactTime: new Date(notification.createdAt).toLocaleString(),
      isRead: notification.isRead,
      // Every notification type the backend produces sets RelatedEntityId to
      // the ticket id, so this is a safe deep link for all of them.
      ticketId: notification.relatedEntityId,
    };
  }

  /**
   * Opens the ticket the notification is about and marks it read on the way.
   * Customers live under /portal, staff under /app — the tenant context knows
   * which session this is.
   */
  onOpen(item: TrayItem): void {
    if (!item.isRead) {
      this.notificationService.markAlertAsRead(item.id).subscribe({
        error: () => {
          /* Navigation matters more than the read receipt. */
        },
      });
    }

    if (!item.ticketId) return;

    this.menuTrigger()?.closeMenu();

    const base = this.tenantContext.currentCustomerId()
      ? '/portal/tickets'
      : '/app/tickets';
    void this.router.navigate([base, item.ticketId]);
  }

  onMarkRead(item: TrayItem, event: Event): void {
    event.stopPropagation();
    this.notificationService.markAlertAsRead(item.id).subscribe({
      error: (err: Error) => this.toast.error(err.message),
    });
  }

  onMarkAllRead(): void {
    if (this.unreadCount() === 0 || this.isMarkingAll()) return;

    this.isMarkingAll.set(true);
    this.notificationService.markAllAlertsAsRead().subscribe({
      next: () => {
        this.isMarkingAll.set(false);
        this.toast.success('All notifications marked as read.');
      },
      error: (err: Error) => {
        this.isMarkingAll.set(false);
        this.toast.error(err.message);
      },
    });
  }

  onRefresh(event: Event): void {
    event.stopPropagation();
    this.notificationService.loadHistoricalAlerts().subscribe({
      error: (err: Error) => this.toast.error(err.message),
    });
  }

  setFilter(value: 'all' | 'unread', event: Event): void {
    event.stopPropagation();
    this.filter.set(value);
  }

  /** Short relative label — "4m", "3h", "2d" — falling back to a date. */
  private relativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    const minutes = Math.floor((Date.now() - then) / 60000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }
}
