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
    this.availableOrganizations.set([]);

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
    return this.http
      .get<UserMeResponse>(`${this.baseUrl}/me`)
      .pipe(tap((user) => this.currentUser.set(user)));
  }

  fetchMyOrganizations(): Observable<OrganizationSummary[]> {
    return this.http
      .get<OrganizationSummary[]>(`${this.orgsUrl}/mine`)
      .pipe(tap((orgs) => this.availableOrganizations.set(orgs)));
  }

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

    // =========================================================================
    // 🤝 SECURE CUSTOMER INITIALIZATION LIFECYCLE
    // =========================================================================
    if (orgs.length === 0) {
      const activeToken = this.token();
      if (activeToken) {
        try {
          // Decode the token payload array natively
          const base64Url = activeToken.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join(''),
          );

          const decodedToken = JSON.parse(jsonPayload);

          // Extract the direct organizational identity parameters claim injected by your token generator
          const organizationId =
            decodedToken.organizationId || decodedToken.OrganizationId;

          if (organizationId) {
            this.tenantContext.setOrganization(organizationId);
          }
        } catch (e) {
          console.error(
            'Error extracting customer organization token context claims:',
            e,
          );
        }
      }

      this.router.navigate(['/portal/tickets']);
      return;
    }

    // =========================================================================
    // 👥 STAFF / OPERATIONS INITIALIZATION LIFECYCLE
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
  }

  private initializeSession(): void {
    if (!this.token()) {
      return;
    }

    this.fetchMe().subscribe({
      error: (err) => {
        if (err?.status === 401) {
          this.logout();
        }
      },
    });
  }
}
