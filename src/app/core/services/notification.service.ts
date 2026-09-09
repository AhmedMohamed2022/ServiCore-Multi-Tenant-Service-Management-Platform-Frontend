import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/services/auth.service';
import { NotificationDto } from '../models/notification.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiBaseUrl}/notifications`;

  // Dynamic native script asset loader proxy state properties
  private hubConnection: any | null = null;

  // Structural State Signals
  readonly registryList = signal<NotificationDto[]>([]);
  readonly unreadCount = computed(
    () => this.registryList().filter((n) => !n.isRead).length,
  );

  constructor() {
    // Automatically trigger real-time connections if a session token is active
    if (this.authService.token()) {
      this.loadHistoricalAlerts().subscribe({
        next: () => this.initializeRealtimeHubConnection(),
      });
    }
  }

  loadHistoricalAlerts(): Observable<NotificationDto[]> {
    return this.http
      .get<NotificationDto[]>(this.baseUrl)
      .pipe(tap((alerts) => this.registryList.set(alerts)));
  }

  markAlertAsRead(id: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/read`, {}).pipe(
      tap(() => {
        // Optimistically mutate single item read flag parameter property matches
        this.registryList.update((list) =>
          list.map((item) =>
            item.id === id ? { ...item, isRead: true } : item,
          ),
        );
      }),
    );
  }

  private async initializeRealtimeHubConnection(): Promise<void> {
    const activeToken = this.authService.token();
    if (!activeToken || this.hubConnection) return;

    try {
      // Modern pattern: Dynamically inject script wrapper arrays to support clean builds
      const signalR = await import('@microsoft/signalr');

      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(
          `${environment.apiBaseUrl.replace('/api', '')}/hubs/notifications`,
          {
            accessTokenFactory: () => activeToken,
          },
        )
        .withAutomaticReconnect()
        .build();

      // Register the precise backend custom server-to-client invocation hook event name
      this.hubConnection.on(
        'notification:new',
        (incomingAlert: NotificationDto) => {
          this.registryList.update((current) => [incomingAlert, ...current]);
        },
      );

      await this.hubConnection.start();
    } catch (err) {
      console.error('SignalR WebSocket session connectivity drop loop:', err);
    }
  }

  terminateHubSession(): void {
    if (this.hubConnection) {
      this.hubConnection.stop();
      this.hubConnection = null;
    }
    this.registryList.set([]);
  }
}
