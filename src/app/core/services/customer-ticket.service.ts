import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CustomerTicketDto {
  id: string;
  title: string;
  description: string;
  status: number;
  priority: number;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class CustomerTicketService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/tickets`;

  getMyTickets(): Observable<CustomerTicketDto[]> {
    return this.http.get<CustomerTicketDto[]>(this.apiUrl);
  }

  // Fixed: Combines the required root request wrapper with omitted empty Guid parameters
  createPortalTicket(
    title: string,
    description: string,
    categoryId: string,
    priority: number,
  ): Observable<CustomerTicketDto> {
    const payload = {
      request: {
        title: title.trim(),
        description: description.trim(),
        categoryId: categoryId,
        priority: priority, // Numeric base index integer matching TicketPriority Enum
      },
    };

    return this.http.post<CustomerTicketDto>(this.apiUrl, payload);
  }
}
