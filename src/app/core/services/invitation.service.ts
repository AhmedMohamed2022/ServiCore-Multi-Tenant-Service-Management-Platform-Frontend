import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  InviteOrganizationMemberRequest,
  InviteCustomerRequest,
  OrganizationInvitationDto,
} from '../../features/management/models/invitation.model';

@Injectable({
  providedIn: 'root',
})
export class InvitationService {
  private readonly http = inject(HttpClient);
  private readonly staffApiUrl = `${environment.apiBaseUrl}/organization/invitations`;
  private readonly customerApiUrl = `${environment.apiBaseUrl}/customer-invitations`;

  sendStaffInvitation(
    request: InviteOrganizationMemberRequest,
  ): Observable<void> {
    return this.http.post<void>(this.staffApiUrl, request);
  }

  sendCustomerInvitation(request: InviteCustomerRequest): Observable<void> {
    return this.http.post<void>(this.customerApiUrl, request);
  }

  // Gated by [Authorize(Policy = "CanManageStaff")] server-side (Owner/Manager
  // only). Used both to list invitations and, in AppShellComponent, purely as
  // a probe: a 200 means the current user is Owner/Manager in the active org,
  // a 403 means they're not — this is the real backend truth, not a guess.
  getInvitations(): Observable<OrganizationInvitationDto[]> {
    return this.http.get<OrganizationInvitationDto[]>(this.staffApiUrl);
  }

  // POST /api/organization/invitations/{invitationId}/revoke — [CanManageStaff]
  revokeStaffInvitation(invitationId: string): Observable<void> {
    return this.http.post<void>(
      `${this.staffApiUrl}/${invitationId}/revoke`,
      {},
    );
  }
}
