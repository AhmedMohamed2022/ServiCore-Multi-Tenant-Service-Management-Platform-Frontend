/**
 * Mirrors ServiCore.Application.Tickets.DTOs.TicketCommentDto:
 *
 *   TicketCommentDto(Id, TicketId, AuthorUserId, Content, CreatedAt)
 *
 * Defect #2 in the redesign brief. This interface used to declare `userId` and
 * `userEmail`. Neither field is on the wire: the author arrives as
 * `authorUserId` and there is no email anywhere in the payload. The result was
 * that every comment rendered a blank author line, a `?` avatar, and a
 * "mine vs theirs" comparison (`comment.userEmail === activeUserEmail()`) that
 * could never be true — so the current user's own messages were never
 * recognised as their own.
 *
 * The identity comparison now runs against `AuthService.currentUser()?.userId`,
 * which is the same Identity user id the server stamps onto the comment.
 */
export interface TicketCommentDto {
  id: string;
  ticketId: string;
  authorUserId: string;
  content: string;
  createdAt: string;
}

export interface AddTicketCommentRequest {
  content: string;
}
