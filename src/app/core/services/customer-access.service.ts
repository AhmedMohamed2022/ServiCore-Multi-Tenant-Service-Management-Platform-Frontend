import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CustomerMembership } from '../auth/models/auth.models';

// Thin wrapper around GET /customers/mine — the backend endpoint a
// customer's own account uses to discover which organization(s) it's
// linked to (there is no organizationId claim in the JWT, so this is the
// only real way to find out). Shared by AuthService (automatic bootstrap
// right after login) and PortalActivateComponent (manual/edge-case path).
@Injectable({ providedIn: 'root' })
export class CustomerAccessService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/customers`;

  getMine(): Observable<CustomerMembership[]> {
    return this.http.get<CustomerMembership[]>(`${this.baseUrl}/mine`);
  }
}
