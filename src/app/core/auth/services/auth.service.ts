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

export interface ExtendedUserMeResponse extends UserMeResponse {
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tenantContext = inject(TenantContextService);

  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;
  private readonly orgsUrl = `${environment.apiBaseUrl}/organizations`;
  private readonly TOKEN_KEY = 'servicore_jwt_token';

  readonly token = signal<string | null>(localStorage.getItem(this.TOKEN_KEY));
  readonly currentUser = signal<ExtendedUserMeResponse | null>(null);
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
    return this.http.get<UserMeResponse>(`${this.baseUrl}/me`).pipe(
      tap((user) => {
        const activeToken = this.token();
        let extractedRoles: string[] = [];

        if (activeToken) {
          try {
            const base64Url = activeToken.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map(
                  (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2),
                )
                .join(''),
            );
            const decodedToken = JSON.parse(jsonPayload);
            const claimKey = 'http://microsoft.com';
            const rawRoles =
              decodedToken['role'] || decodedToken[claimKey] || [];
            extractedRoles = Array.isArray(rawRoles) ? rawRoles : [rawRoles];
          } catch (e) {
            console.error('Error reading JWT identity role array payload:', e);
          }
        }

        this.currentUser.set({
          ...user,
          roles: extractedRoles,
        });
      }),
    );
  }

  fetchMyOrganizations(): Observable<OrganizationSummary[]> {
    return this.http
      .get<OrganizationSummary[]>(`${this.orgsUrl}/mine`)
      .pipe(tap((orgs) => this.availableOrganizations.set(orgs)));
  }

  selectOrganization(organizationId: string): void {
    this.tenantContext.setOrganization(organizationId);
    this.router.navigate(['/app/dashboard']);
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
    // 🤝 CUSTOMER PROFILE REDIRECTION & AUTOMATED JET ENGINE INITIALIZATION
    // =========================================================================
    if (orgs.length === 0) {
      const activeToken = this.token();
      if (activeToken) {
        try {
          const base64Url = activeToken.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join(''),
          );
          const decodedToken = JSON.parse(jsonPayload);

          // Fix: Extracting the actual token organization context payload
          const targetOrgId =
            decodedToken.organizationId ||
            decodedToken.OrganizationId ||
            decodedToken.tenantId;

          if (targetOrgId) {
            this.tenantContext.setOrganization(targetOrgId);
            this.router.navigate(['/portal/tickets']);
            return;
          }
        } catch (e) {
          console.error('Error parsing customer context:', e);
        }
      }

      // Fallback: If organization is completely missing from token context, route to manual entry activation
      this.router.navigate(['/portal/activate-device']);
      return;
    }

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
