import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../../core/services/notification.service';
import { NotificationDto } from '../../../../core/models/notification.model';

@Component({
  selector: 'app-notification-tray',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-tray.component.html',
  styleUrls: ['./notification-tray.component.css'],
})
export class NotificationTrayComponent {
  protected readonly alertService = inject(NotificationService);

  readonly isTrayOpen = signal<boolean>(false);

  toggleTrayMenuView(): void {
    this.isTrayOpen.update((val) => !val);
  }

  onMarkRead(event: Event, item: NotificationDto): void {
    event.stopPropagation(); // Stops event bubbling to prevent closing the dropdown menu drawer
    if (item.isRead) return;

    this.alertService.markAlertAsRead(item.id).subscribe();
  }
}
