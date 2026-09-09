export enum TicketStatus {
  New = 0,
  Open = 1,
  InProgress = 2,
  WaitingForCustomer = 3,
  Resolved = 4,
  Closed = 5,
}

export enum TicketPriority {
  Low = 0,
  Medium = 1,
  High = 2,
  Urgent = 3,
}

export const TicketStatusLabels: Record<TicketStatus, string> = {
  [TicketStatus.New]: 'New',
  [TicketStatus.Open]: 'Open',
  [TicketStatus.InProgress]: 'In Progress',
  [TicketStatus.WaitingForCustomer]: 'Waiting For Customer',
  [TicketStatus.Resolved]: 'Resolved',
  [TicketStatus.Closed]: 'Closed',
};

export const TicketPriorityLabels: Record<TicketPriority, string> = {
  [TicketPriority.Low]: 'Low',
  [TicketPriority.Medium]: 'Medium',
  [TicketPriority.High]: 'High',
  [TicketPriority.Urgent]: 'Urgent',
};
