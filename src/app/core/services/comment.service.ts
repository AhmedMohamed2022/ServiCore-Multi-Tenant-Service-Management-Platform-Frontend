import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TicketCommentDto,
  AddTicketCommentRequest,
} from '../../features/tickets/models/comment.model';

@Injectable({
  providedIn: 'root',
})
export class CommentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/tickets`;

  getComments(ticketId: string): Observable<TicketCommentDto[]> {
    return this.http.get<TicketCommentDto[]>(
      `${this.baseUrl}/${ticketId}/comments`,
    );
  }

  addComment(
    ticketId: string,
    request: AddTicketCommentRequest,
  ): Observable<TicketCommentDto> {
    return this.http.post<TicketCommentDto>(
      `${this.baseUrl}/${ticketId}/comments`,
      request,
    );
  }
}
