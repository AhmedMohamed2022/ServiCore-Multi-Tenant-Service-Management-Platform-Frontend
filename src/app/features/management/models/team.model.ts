/**
 * Mirrors ServiCore.Application.Teams.DTOs.TeamDto:
 *   TeamDto(Id, OrganizationId, Name, Description, CreatedAt)
 *
 * `isActive` used to be declared here and is not on the wire. The team roster
 * rendered a status chip from it, so every team was permanently labelled
 * "Suspended". Teams do have an IsActive flag on the domain entity, but the
 * DTO does not expose it — so nothing in the UI may claim to know it.
 */
export interface TeamDto {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  createdAt: string;
}

/**
 * Mirrors ServiCore.Application.Teams.DTOs.TeamMemberDto:
 *   TeamMemberDto(TeamId, UserId, JoinedAt)
 *
 * This is the single most misleading model in the frontend as it stood. It
 * declared `{ userId, email, name, role }`, and §4 of the redesign brief
 * repeats that shape — but TeamMembershipService.GetMembersAsync projects
 * `new TeamMemberDto(x.TeamId, x.UserId, x.JoinedAt)` and nothing else. There
 * is no name, no email and no role on this endpoint.
 *
 * The visible consequence: the ticket assignment dropdown reads
 * `agent.name || 'System Agent'`, so every option in it was labelled
 * "System Agent", and the team roster page rendered blank member names.
 *
 * Display names for these user ids come from AgentDirectoryService instead,
 * which is the only source in the entire API that maps an Identity user id to
 * a human-readable name.
 */
export interface TeamMemberDto {
  teamId: string;
  userId: string;
  joinedAt: string;
}

export interface CreateTeamRequest {
  name: string;
  description?: string | null;
}

export interface UpdateTeamRequest {
  name: string;
  description?: string | null;
}

export interface AddTeamMemberRequest {
  userId: string;
}
