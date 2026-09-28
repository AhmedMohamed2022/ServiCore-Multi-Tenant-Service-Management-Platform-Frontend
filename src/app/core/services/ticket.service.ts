import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TicketDto,
  CreateTicketRequest,
  UpdateTicketRequest,
} from '../../features/tickets/models/ticket.model';

@Injectable({
  providedIn: 'root',
})
export class TicketService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/tickets`;

  getTickets(): Observable<TicketDto[]> {
    return this.http.get<TicketDto[]>(this.baseUrl);
  }

  getTicketById(id: string): Observable<TicketDto> {
    return this.http.get<TicketDto>(`${this.baseUrl}/${id}`);
  }

  createTicket(request: CreateTicketRequest): Observable<TicketDto> {
    return this.http.post<TicketDto>(this.baseUrl, request);
  }

  updateTicket(id: string, request: UpdateTicketRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, request);
  }

  assignTeam(id: string, teamId: string): Observable<TicketDto> {
    return this.http.post<TicketDto>(`${this.baseUrl}/${id}/assign-team`, {
      teamId,
    });
  }

  assignTicket(id: string, agentId: string): Observable<TicketDto> {
    return this.http.post<TicketDto>(`${this.baseUrl}/${id}/assign`, {
      agentId,
    });
  }

  /**
   * The backend deliberately exposes two separate endpoints here —
   * POST {id}/unassign-agent and POST {id}/unassign-team — rather than one
   * generic "unassign". This used to be a single `unassignTicket()` that
   * posted to `{id}/unassign`, a route that has never existed on the API
   * (TicketsController only maps unassign-agent and unassign-team), so every
   * unassign click in the app 404'd. Removing the assigned agent and
   * returning a ticket to the triage queue are different operations with
   * different rules — a team cannot be removed while an agent is still
   * assigned — so the frontend needs both, not one.
   */
  unassignAgent(id: string): Observable<TicketDto> {
    return this.http.post<TicketDto>(`${this.baseUrl}/${id}/unassign-agent`, {});
  }

  unassignTeam(id: string): Observable<TicketDto> {
    return this.http.post<TicketDto>(`${this.baseUrl}/${id}/unassign-team`, {});
  }

  // --- Realigned Action Lifecycle Implementations ---
  openTicket(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/open`, {});
  }

  startTicket(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/start`, {});
  }

  waitForCustomer(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/wait-for-customer`, {});
  }

  resolveTicket(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/resolve`, {});
  }

  closeTicket(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/close`, {});
  }
}
