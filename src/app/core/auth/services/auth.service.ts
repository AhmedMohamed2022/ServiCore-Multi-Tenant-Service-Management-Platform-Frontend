import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, switchMap, map, catchError, of, Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TenantContextService } from '../../services/tenant-context.service';
import { CustomerAccessService } from '../../services/customer-access.service';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UserMeResponse,
  OrganizationSummary,
  CustomerMembership,
} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tenantContext = inject(TenantContextService);
  private readonly customerAccess = inject(CustomerAccessService);

  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;
  private readonly orgsUrl = `${environment.apiBaseUrl}/organizations`;
  private readonly TOKEN_KEY = 'servicore_jwt_token';

  /**
   * Emits whenever the current authenticated session ends.
   *
   * NotificationService listens to this event so it can terminate
   * the SignalR connection without creating a circular dependency
   * between AuthService and NotificationService.
   */
  private readonly sessionEndedSubject = new Subject<void>();
  readonly sessionEnded$ = this.sessionEndedSubject.asObservable();

  readonly token = signal<string | null>(localStorage.getItem(this.TOKEN_KEY));

  readonly currentUser = signal<UserMeResponse | null>(null);

  readonly availableOrganizations = signal<OrganizationSummary[]>([]);

  readonly isAuthenticated = computed(() => !!this.token());

  constructor() {
    this.initializeSession();
  }

  login(request: LoginRequest): Observable<UserMeResponse> {
    /*
     * End any previous authenticated session first.
     *
     * This is important when another user/session already exists
     * in the same browser before a new login is performed.
     */
    this.endCurrentSession();

    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, request).pipe(
      tap((res) => {
        localStorage.setItem(this.TOKEN_KEY, res.token);

        this.token.set(res.token);
      }),

      switchMap(() => this.fetchMe()),

      switchMap((user) => this.fetchMyOrganizations().pipe(map(() => user))),

      tap({
        next: () => this.routeAfterLogin(),
        error: () => this.logout(),
      }),
    );
  }

  register(request: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(
      `${this.baseUrl}/register`,
      request,
    );
  }

  fetchMe(): Observable<UserMeResponse> {
    return this.http.get<UserMeResponse>(`${this.baseUrl}/me`).pipe(
      tap((user) => {
        this.currentUser.set(user);
      }),
    );
  }

  fetchMyOrganizations(): Observable<OrganizationSummary[]> {
    return this.http.get<OrganizationSummary[]>(`${this.orgsUrl}/mine`).pipe(
      tap((orgs) => {
        this.availableOrganizations.set(orgs);
      }),
    );
  }

  selectOrganization(organizationId: string): void {
    this.tenantContext.setOrganization(organizationId);

    this.router.navigate(['/app/dashboard']);
  }

  logout(): void {
    this.endCurrentSession();

    this.router.navigate(['/login']);
  }

  private endCurrentSession(): void {
    /*
     * Notify session-aware services BEFORE clearing the
     * authentication/tenant state.
     */
    this.sessionEndedSubject.next();

    localStorage.removeItem(this.TOKEN_KEY);

    this.tenantContext.clearOrganization();

    this.token.set(null);

    this.currentUser.set(null);

    this.availableOrganizations.set([]);
  }

  private routeAfterLogin(): void {
    const orgs = this.availableOrganizations();

    // =========================================================================
    // 👥 STAFF MEMBERS WORKSPACE INITIALIZATION
    // =========================================================================

    if (orgs.length === 1) {
      this.tenantContext.setOrganization(orgs[0].id);

      this.router.navigate(['/app/dashboard']);

      return;
    }

    if (orgs.length > 1) {
      this.router.navigate(['/select-organization']);

      return;
    }

    // =========================================================================
    // 🤝 CUSTOMER PROFILE REDIRECTION
    // =========================================================================

    this.routeCustomerAfterLogin();
  }

  private routeCustomerAfterLogin(): void {
    this.customerAccess
      .getMine()
      .pipe(catchError(() => of([] as CustomerMembership[])))
      .subscribe((memberships) => {
        if (memberships.length === 1) {
          const membership = memberships[0];

          this.tenantContext.setOrganization(
            membership.organizationId,
            membership.customerId,
          );

          this.router.navigate(['/portal/tickets']);

          return;
        }

        this.router.navigate(['/portal/activate-device']);
      });
  }

  private initializeSession(): void {
    if (this.token()) {
      this.fetchMe().subscribe({
        error: (err) => {
          if (err?.status === 401) {
            this.logout();
          }
        },
      });
    }
  }
}
