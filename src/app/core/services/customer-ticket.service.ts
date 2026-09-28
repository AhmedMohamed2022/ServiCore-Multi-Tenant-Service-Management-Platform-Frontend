import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TicketDto } from '../../features/tickets/models/ticket.model';

@Injectable({
  providedIn: 'root',
})
export class CustomerTicketService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/customer-tickets`;
  private readonly ticketsApiUrl = `${environment.apiBaseUrl}/tickets`;

  getMyTickets(): Observable<TicketDto[]> {
    return this.http.get<TicketDto[]>(this.ticketsApiUrl);
  }

  createPortalTicket(
    title: string,
    description: string,
    categoryId: string,
    priority: number,
  ): Observable<TicketDto> {
    const payload = {
      categoryId,
      title: title.trim(),
      description: description.trim(),
      priority,
    };

    return this.http.post<TicketDto>(this.apiUrl, payload);
  }
}
