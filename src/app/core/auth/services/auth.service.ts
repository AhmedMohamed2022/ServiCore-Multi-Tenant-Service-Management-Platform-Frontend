import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, switchMap, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TenantContextService } from '../../services/tenant-context.service';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UserMeResponse,
  OrganizationSummary,
} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tenantContext = inject(TenantContextService);

  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;
  private readonly orgsUrl = `${environment.apiBaseUrl}/organizations`;
  private readonly TOKEN_KEY = 'servicore_jwt_token';

  readonly token = signal<string | null>(localStorage.getItem(this.TOKEN_KEY));
  readonly currentUser = signal<UserMeResponse | null>(null);
  readonly availableOrganizations = signal<OrganizationSummary[]>([]);
  readonly isAuthenticated = computed(() => !!this.token());

  constructor() {
    this.initializeSession();
  }

  login(request: LoginRequest): Observable<UserMeResponse> {
    localStorage.removeItem(this.TOKEN_KEY);
    this.tenantContext.clearOrganization();
    this.token.set(null);
    this.currentUser.set(null);

    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, request).pipe(
      tap((res) => {
        localStorage.setItem(this.TOKEN_KEY, res.token);
        this.token.set(res.token);
        // No org header needed yet — /auth/me and /organizations/mine
        // are exempt from tenant resolution on the backend.
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
    // Don't set tenant context here — the user isn't logged in yet.
    // login() re-derives it from /organizations/mine right after.
    return this.http.post<RegisterResponse>(
      `${this.baseUrl}/register`,
      request,
    );
  }

  fetchMe(): Observable<UserMeResponse> {
    return this.http
      .get<UserMeResponse>(`${this.baseUrl}/me`)
      .pipe(tap((user) => this.currentUser.set(user)));
  }

  fetchMyOrganizations(): Observable<OrganizationSummary[]> {
    return this.http
      .get<OrganizationSummary[]>(`${this.orgsUrl}/mine`)
      .pipe(tap((orgs) => this.availableOrganizations.set(orgs)));
  }

  /** Call this from an org-picker screen when the user has 2+ orgs. */
  selectOrganization(organizationId: string): void {
    this.tenantContext.setOrganization(organizationId);
    this.router.navigate(['/app/management/teams']);
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.tenantContext.clearOrganization();
    this.token.set(null);
    this.currentUser.set(null);
    this.availableOrganizations.set([]);
    this.router.navigate(['/login']);
  }

  private routeAfterLogin(): void {
    const orgs = this.availableOrganizations();

    if (orgs.length === 1) {
      this.tenantContext.setOrganization(orgs[0].id);
      this.router.navigate(['/app/management/teams']);
      return;
    }

    if (orgs.length > 1) {
      this.router.navigate(['/select-organization']);
      return;
    }

    // Authenticated, but not a member of any organization.
    this.router.navigate(['/no-organization']);
  }

  private initializeSession(): void {
    if (!this.token()) {
      return;
    }

    this.fetchMe().subscribe({
      error: (err) => {
        // errorInterceptor already handles real auth failures (401).
        // Anything else here (400/403 tenant issues, network errors)
        // shouldn't blow away a token that's still perfectly valid.
        if (err?.status === 401) {
          this.logout();
        }
      },
    });
  }
}
