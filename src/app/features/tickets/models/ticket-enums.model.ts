export enum TicketStatus {
  New = 1,
  Open = 2,
  InProgress = 3,
  WaitingForCustomer = 4,
  Resolved = 5,
  Closed = 6,
}

export enum TicketPriority {
  Low = 1,
  Medium = 2,
  High = 3,
  // Renamed from `Urgent` to match ServiCore.Domain.Enums.TicketPriority,
  // which defines this member as Critical. The numeric value is unchanged, so
  // nothing on the wire moves — only the label the user reads.
  Critical = 4,
}

export const TicketStatusLabels: Record<number, string> = {
  1: 'New',
  2: 'Open',
  3: 'In Progress',
  4: 'Waiting for Customer',
  5: 'Resolved',
  6: 'Closed',
};

export const TicketPriorityLabels: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Critical',
};

/**
 * Semantic tone per §18 of the redesign brief. These map onto the `sc-badge-*`
 * classes in styles.scss, so status colour is decided in exactly one place
 * instead of being re-guessed by every template.
 */
export type SemanticTone =
  | 'neutral'
  | 'info'
  | 'primary'
  | 'success'
  | 'warn'
  | 'danger';

export const TicketStatusTones: Record<number, SemanticTone> = {
  [TicketStatus.New]: 'neutral',
  [TicketStatus.Open]: 'info',
  [TicketStatus.InProgress]: 'primary',
  [TicketStatus.WaitingForCustomer]: 'warn',
  [TicketStatus.Resolved]: 'success',
  [TicketStatus.Closed]: 'neutral',
};

export const TicketPriorityTones: Record<number, SemanticTone> = {
  [TicketPriority.Low]: 'neutral',
  [TicketPriority.Medium]: 'info',
  [TicketPriority.High]: 'warn',
  [TicketPriority.Critical]: 'danger',
};

/**
 * Colour is never the only carrier of meaning (§18 and §19) — each state also
 * gets a distinct icon that survives greyscale and colour blindness.
 */
export const TicketStatusIcons: Record<number, string> = {
  [TicketStatus.New]: 'fiber_new',
  [TicketStatus.Open]: 'radio_button_unchecked',
  [TicketStatus.InProgress]: 'progress_activity',
  [TicketStatus.WaitingForCustomer]: 'schedule',
  [TicketStatus.Resolved]: 'task_alt',
  [TicketStatus.Closed]: 'lock',
};

export const TicketPriorityIcons: Record<number, string> = {
  [TicketPriority.Low]: 'keyboard_arrow_down',
  [TicketPriority.Medium]: 'remove',
  [TicketPriority.High]: 'keyboard_arrow_up',
  [TicketPriority.Critical]: 'priority_high',
};

/** Statuses that represent live work — used for "active" counts and filters. */
export const ACTIVE_TICKET_STATUSES: readonly TicketStatus[] = [
  TicketStatus.New,
  TicketStatus.Open,
  TicketStatus.InProgress,
  TicketStatus.WaitingForCustomer,
];

export const isActiveStatus = (status: TicketStatus): boolean =>
  ACTIVE_TICKET_STATUSES.includes(status);

/** Ordered for pickers and filter rows, so every list shows the same sequence. */
export const TICKET_STATUS_ORDER: readonly TicketStatus[] = [
  TicketStatus.New,
  TicketStatus.Open,
  TicketStatus.InProgress,
  TicketStatus.WaitingForCustomer,
  TicketStatus.Resolved,
  TicketStatus.Closed,
];

export const TICKET_PRIORITY_ORDER: readonly TicketPriority[] = [
  TicketPriority.Low,
  TicketPriority.Medium,
  TicketPriority.High,
  TicketPriority.Critical,
];
