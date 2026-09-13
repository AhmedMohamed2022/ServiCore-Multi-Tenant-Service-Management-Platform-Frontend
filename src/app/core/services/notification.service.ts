import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/services/auth.service';
import { TenantContextService } from './tenant-context.service';
import { NotificationDto } from '../models/notification.model';
import { TicketCommentDto } from '../../features/tickets/models/comment.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly baseUrl = `${environment.apiBaseUrl}/notifications`;

  private hubConnection: any | null = null;

  // Real-time Event Streaming Subject specifically for incoming ticket comments
  readonly incomingCommentsStream$ = new Subject<TicketCommentDto>();

  readonly registryList = signal<NotificationDto[]>([]);
  readonly unreadCount = computed(
    () => this.registryList().filter((n) => !n.isRead).length,
  );

  constructor() {
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
    return this.http.put<void>(`${this.baseUrl}/${id}/read`, {});
  }

  private buildHubUrl(): string {
    const base = `${environment.apiBaseUrl.replace('/api', '')}/hubs/notifications`;
    const organizationId = this.tenantContext.currentOrganizationId();

    // WebSocket/SSE transports can't carry custom request headers from the
    // browser, so — exactly like the JWT via accessTokenFactory — the org id
    // has to travel as a query string parameter to survive every transport
    // SignalR might negotiate down to.
    return organizationId
      ? `${base}?organizationId=${encodeURIComponent(organizationId)}`
      : base;
  }

  private async initializeRealtimeHubConnection(): Promise<void> {
    const activeToken = this.authService.token();
    if (!activeToken || this.hubConnection) return;

    try {
      const signalR = await import('@microsoft/signalr');

      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(this.buildHubUrl(), {
          accessTokenFactory: () => activeToken,
        })
        .withAutomaticReconnect()
        .build();

      // Monitor standard system notifications center updates
      this.hubConnection.on(
        'notification:new',
        (incomingAlert: NotificationDto) => {
          this.registryList.update((current) => [incomingAlert, ...current]);
        },
      );

      // Listen directly to the backend real-time comment broadcast event
      this.hubConnection.on(
        'ticket:comment-added',
        (incomingComment: TicketCommentDto) => {
          this.incomingCommentsStream$.next(incomingComment);
        },
      );

      await this.hubConnection.start();
    } catch (err) {
      console.error('SignalR Hub Connection initialization error:', err);
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
