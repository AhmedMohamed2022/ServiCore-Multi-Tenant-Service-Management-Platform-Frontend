export interface TicketCommentDto {
  id: string;
  ticketId: string;
  userId: string;
  userEmail?: string | null;
  content: string;
  createdAt: string;
}

export interface AddTicketCommentRequest {
  content: string;
}
