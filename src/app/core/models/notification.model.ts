/**
 * Mirrors ServiCore.Application.Notifications.DTOs.NotificationDto:
 *
 *   NotificationDto(Id, Type, Title, Message, RelatedEntityId,
 *                   CreatedAt, ReadAt, IsRead)
 *
 * The frontend previously declared only id/title/message/isRead/createdAt,
 * which threw away the two most useful fields on the record:
 *
 *  - `type`, which says what happened, so the tray can show a meaningful icon
 *    instead of one generic bell for everything.
 *  - `relatedEntityId`, which every producer sets to the ticket id
 *    (TicketService and TicketCommentService both pass `RelatedEntityId:
 *    ticket.Id` for all five notification types). That is the deep link the
 *    tray needed and could not previously build.
 */
export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Always the related ticket's id for every type the backend produces. */
  relatedEntityId: string | null;
  createdAt: string;
  readAt: string | null;
  isRead: boolean;
}

/** Mirrors ServiCore.Domain.Enums.NotificationType. */
export enum NotificationType {
  TicketAssigned = 1,
  TicketCommentAdded = 2,
  TicketStatusChanged = 3,
  TicketResolved = 4,
  TicketClosed = 5,
}

/**
 * Material Symbols glyphs per type, drawn from the same icon vocabulary the
 * ticket badges use so a "resolved" notification and a Resolved badge read as
 * the same event.
 */
export const NotificationTypeIcons: Record<NotificationType, string> = {
  [NotificationType.TicketAssigned]: 'assignment_ind',
  [NotificationType.TicketCommentAdded]: 'chat_bubble',
  [NotificationType.TicketStatusChanged]: 'sync_alt',
  [NotificationType.TicketResolved]: 'task_alt',
  [NotificationType.TicketClosed]: 'lock',
};

export const NotificationTypeTones: Record<NotificationType, string> = {
  [NotificationType.TicketAssigned]: 'bg-brand-50 text-brand-700',
  [NotificationType.TicketCommentAdded]: 'bg-surface-sunken text-ink-muted',
  [NotificationType.TicketStatusChanged]: 'bg-warn-50 text-warn-700',
  [NotificationType.TicketResolved]: 'bg-success-50 text-success-700',
  [NotificationType.TicketClosed]: 'bg-surface-sunken text-ink-muted',
};

export const NotificationTypeLabels: Record<NotificationType, string> = {
  [NotificationType.TicketAssigned]: 'Assigned',
  [NotificationType.TicketCommentAdded]: 'New message',
  [NotificationType.TicketStatusChanged]: 'Status change',
  [NotificationType.TicketResolved]: 'Resolved',
  [NotificationType.TicketClosed]: 'Closed',
};
