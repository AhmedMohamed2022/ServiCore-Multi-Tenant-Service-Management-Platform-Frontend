import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/services/auth.service';
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
  private readonly authService = inject(AuthService);
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

  /**
   * Team ids the current user has a TeamMember row for, computed client-side.
   *
   * Neither GET /teams nor GET /teams/{id}/members is scoped past plain
   * authentication (see the doc comments on TeamDto/TeamMemberDto), and no
   * endpoint in the API returns the caller's own per-organization role. The
   * backend's own authorization model defines "the teams a Manager is
   * responsible for" exactly this way — OrganizationMember.Role == Manager
   * AND a TeamMember row for that team (see TeamMembershipService) — so this
   * mirrors that definition to decide what the UI *offers*. The backend
   * re-checks real membership on every mutating call regardless; this is not
   * an authorization decision.
   *
   * Owners are not expected to hold TeamMember rows — there's no ticket-
   * assignment reason for an Owner to join a team — so callers read an empty
   * set as "this viewer isn't limited to a subset of teams" rather than
   * "this viewer belongs to zero teams." An Owner who *has* been added to a
   * team as a member is the one edge case this can't distinguish from a
   * Manager; it would see the narrower, team-scoped view. That only narrows
   * what the UI offers to click — it never grants or blocks anything the
   * backend wouldn't already.
   */
  getMyTeamMemberships(): Observable<ReadonlySet<string>> {
    const userId = this.authService.currentUser()?.userId;
    if (!userId) return of(new Set<string>());

    return this.getTeams().pipe(
      switchMap((teams) => {
        if (teams.length === 0) return of(new Set<string>());

        return forkJoin(
          teams.map((team) =>
            this.getTeamMembers(team.id).pipe(
              map((members) =>
                members.some((m) => m.userId === userId) ? team.id : null,
              ),
              catchError(() => of(null)),
            ),
          ),
        ).pipe(
          map(
            (ids) =>
              new Set(ids.filter((id): id is string => id !== null)),
          ),
        );
      }),
      catchError(() => of(new Set<string>())),
    );
  }
}
