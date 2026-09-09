import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateTicketRequest,
  TicketDto,
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

  assignTicket(id: string, agentId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/assign`, {
      userId: agentId,
    });
  }

  unassignTicket(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/unassign`, {});
  }

  updateStatus(id: string, status: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/status`, { status });
  }
}
