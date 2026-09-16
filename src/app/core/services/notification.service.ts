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

  readonly incomingCommentsStream$ = new Subject<TicketCommentDto>();

  readonly registryList = signal<NotificationDto[]>([]);

  readonly unreadCount = computed(
    () => this.registryList().filter((n) => !n.isRead).length,
  );

  constructor() {
    /*
     * Authentication owns the session lifecycle.
     *
     * NotificationService only reacts to it by terminating
     * the realtime connection and clearing notification state.
     */
    this.authService.sessionEnded$.subscribe(() => {
      this.terminateHubSession();
    });

    if (this.authService.token()) {
      this.loadHistoricalAlerts().subscribe({
        error: (err) => {
          console.error('Failed to load notifications:', err);
        },
      });

      /*
       * Realtime delivery is independent from historical
       * notification retrieval.
       */
      void this.initializeRealtimeHubConnection();
    }
  }

  loadHistoricalAlerts(): Observable<NotificationDto[]> {
    return this.http.get<NotificationDto[]>(this.baseUrl).pipe(
      tap((alerts) => {
        this.registryList.set(alerts);
      }),
    );
  }

  /**
   * POST /notifications/read-all. The endpoint has existed since the
   * notifications feature shipped; the client simply never called it, so the
   * only way to clear a full tray was to tap each item in turn.
   *
   * The local list is updated from the response rather than optimistically,
   * so a failed request leaves the badge count honest.
   */
  markAllAlertsAsRead(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/read-all`, {}).pipe(
      tap(() => {
        const readAt = new Date().toISOString();
        this.registryList.update((current) =>
          current.map((notification) =>
            notification.isRead
              ? notification
              : { ...notification, isRead: true, readAt },
          ),
        );
      }),
    );
  }

  markAlertAsRead(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/read`, {}).pipe(
      tap(() => {
        this.registryList.update((current) =>
          current.map((notification) =>
            notification.id === id
              ? {
                  ...notification,
                  isRead: true,
                  readAt: new Date().toISOString(),
                }
              : notification,
          ),
        );
      }),
    );
  }

  private buildHubUrl(): string {
    const base = `${environment.apiBaseUrl.replace(
      '/api',
      '',
    )}/hubs/notifications`;

    const organizationId = this.tenantContext.currentOrganizationId();

    /*
     * SignalR browser transports cannot rely on arbitrary
     * custom headers, so the tenant identifier is sent as
     * a query parameter.
     *
     * Backend NotificationHub reads:
     *
     *   ?organizationId={organizationId}
     *
     * and validates it through TenantResolver.
     */
    return organizationId
      ? `${base}?organizationId=${encodeURIComponent(organizationId)}`
      : base;
  }

  private async initializeRealtimeHubConnection(): Promise<void> {
    const activeToken = this.authService.token();

    if (!activeToken || this.hubConnection) {
      return;
    }

    const organizationId = this.tenantContext.currentOrganizationId();

    /*
     * A SignalR connection without a tenant is not useful for
     * this application because all groups are tenant-scoped.
     */
    if (!organizationId) {
      return;
    }

    try {
      const signalR = await import('@microsoft/signalr');

      /*
       * The session may have ended while the dynamic SignalR
       * module was loading.
       */
      if (
        !this.authService.token() ||
        this.authService.token() !== activeToken ||
        !this.tenantContext.currentOrganizationId()
      ) {
        return;
      }

      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(this.buildHubUrl(), {
          accessTokenFactory: () => activeToken,
        })
        .withAutomaticReconnect()
        .build();

      this.hubConnection.on(
        'notification:new',
        (incomingAlert: NotificationDto) => {
          this.registryList.update((current) => [incomingAlert, ...current]);
        },
      );

      this.hubConnection.on(
        'ticket:comment-added',
        (incomingComment: TicketCommentDto) => {
          this.incomingCommentsStream$.next(incomingComment);
        },
      );

      await this.hubConnection.start();
    } catch (err) {
      /*
       * If startup fails, don't leave a half-created
       * connection object behind.
       */
      this.hubConnection = null;

      console.error('SignalR Hub Connection initialization error:', err);
    }
  }

  terminateHubSession(): void {
    const connection = this.hubConnection;

    this.hubConnection = null;

    /*
     * Clear client-side realtime state immediately.
     */
    this.registryList.set([]);

    /*
     * stop() returns a Promise. We intentionally don't block
     * logout/navigation waiting for the transport to close.
     */
    if (connection) {
      void connection.stop().catch((err: unknown) => {
        console.error('SignalR Hub Connection termination error:', err);
      });
    }
  }
}
