export interface TicketCommentDto {
  id: string;
  ticketId: string;
  userId: string;
  userEmail: string;
  content: string;
  createdAt: string;
}

export interface AddTicketCommentRequest {
  content: string;
}
