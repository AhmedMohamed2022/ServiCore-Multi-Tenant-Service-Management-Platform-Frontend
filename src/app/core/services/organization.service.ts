import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  OrganizationDto,
  OrganizationMemberDto,
} from '../../features/management/models/organization.model';

@Injectable({
  providedIn: 'root',
})
export class OrganizationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/organizations`;

  getUserOrganizations(): Observable<OrganizationDto[]> {
    return this.http.get<OrganizationDto[]>(`${this.baseUrl}/mine`);
  }

  /**
   * Every member of the active organization, with role. CanManageStaff-gated
   * (Owner or Manager) — a 403 here just means the caller is an Agent/
   * customer, same failure mode AgentDirectoryService already treats as
   * "unavailable" rather than an error.
   */
  getMembers(): Observable<OrganizationMemberDto[]> {
    return this.http.get<OrganizationMemberDto[]>(`${this.baseUrl}/members`);
  }
}
