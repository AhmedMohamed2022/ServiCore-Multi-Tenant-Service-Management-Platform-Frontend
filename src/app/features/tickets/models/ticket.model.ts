import { TicketStatus, TicketPriority } from './ticket-enums.model';

export interface TicketDto {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  organizationId: string;
  categoryId: string;
  categoryName?: string;
  customerId: string;
  customerName?: string;
  assignedAgentId: string | null;
  assignedAgentName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  categoryId: string;
  customerId: string;
  priority: TicketPriority;
}

export interface UpdateTicketRequest {
  title: string;
  description: string;
  categoryId: string;
  priority: TicketPriority;
}
