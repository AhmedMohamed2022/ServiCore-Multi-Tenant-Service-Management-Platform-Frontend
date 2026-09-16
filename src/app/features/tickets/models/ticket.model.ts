import { TicketStatus, TicketPriority } from './ticket-enums.model';

/**
 * Mirrors ServiCore.Application.Tickets.DTOs.TicketDto exactly.
 *
 * Note what is *not* here. The record the API returns carries ids only:
 *
 *   TicketDto(Id, OrganizationId, CustomerId, TeamId, AssignedAgentId,
 *             CategoryId, Title, Description, Priority, Status,
 *             CreatedAt, UpdatedAt, ResolvedAt, ClosedAt)
 *
 * This interface previously declared `customerName`, `categoryName` and
 * `assignedAgentName` as optional strings. The server never sends them, so
 * every template reading those fields rendered an em dash or a placeholder
 * forever. They are gone; display names are now resolved from the entity
 * endpoints (customers, categories, teams) and from the agent directory —
 * see AgentDirectoryService.
 *
 * `resolvedAt` / `closedAt` are the opposite case: the server has always sent
 * them and the frontend simply never declared them, so the ticket timeline had
 * no resolution or closure date to show.
 */
export interface TicketDto {
  id: string;
  organizationId: string;
  customerId: string;
  teamId: string;
  assignedAgentId: string | null;
  categoryId: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  categoryId: string;
  customerId: string;
  teamId: string;
  priority: TicketPriority;
}

export interface UpdateTicketRequest {
  title: string;
  description: string;
  categoryId: string;
  priority: TicketPriority;
}
