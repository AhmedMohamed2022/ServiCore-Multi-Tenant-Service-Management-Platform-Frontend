export interface OrganizationDto {
  id: string;
  name: string;
}

/**
 * Mirrors ServiCore.Domain.Enums.OrganizationRole. No JsonStringEnumConverter
 * is registered in Program.cs, so this serializes as the plain int — same
 * convention as TicketStatus in ticket-enums.model.ts.
 */
export enum OrganizationRole {
  Owner = 1,
  Manager = 2,
  Agent = 3,
}

/**
 * Mirrors ServiCore.Application.Organizations.DTOs.OrganizationMemberDto:
 *   OrganizationMemberDto(UserId, UserName, Role)
 *
 * Backed by GET /api/organizations/members (CanManageStaff: Owner or
 * Manager). This is the only endpoint in the API that returns a Manager's
 * name — GET /reports/agents (AgentDirectoryService) only ever covers Agents.
 */
export interface OrganizationMemberDto {
  userId: string;
  userName: string;
  role: OrganizationRole;
}
