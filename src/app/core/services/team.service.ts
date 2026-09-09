import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TeamDto,
  TeamMemberDto,
  CreateTeamRequest,
  UpdateTeamRequest,
  AddTeamMemberRequest,
} from '../../features/management/models/team.model';

@Injectable({
  providedIn: 'root',
})
export class TeamService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/teams`;

  // --- Team Core Operations ---
  getTeams(): Observable<TeamDto[]> {
    return this.http.get<TeamDto[]>(this.baseUrl);
  }

  getTeamById(id: string): Observable<TeamDto> {
    return this.http.get<TeamDto>(`${this.baseUrl}/${id}`);
  }

  createTeam(request: CreateTeamRequest): Observable<TeamDto> {
    return this.http.post<TeamDto>(this.baseUrl, request);
  }

  updateTeam(id: string, request: UpdateTeamRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, request);
  }

  deleteTeam(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // --- Team Members Operations ---
  getTeamMembers(teamId: string): Observable<TeamMemberDto[]> {
    return this.http.get<TeamMemberDto[]>(`${this.baseUrl}/${teamId}/members`);
  }

  addTeamMember(
    teamId: string,
    request: AddTeamMemberRequest,
  ): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${teamId}/members`, request);
  }

  removeTeamMember(teamId: string, userId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${teamId}/members/${userId}`,
    );
  }
}
