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
  Urgent = 4,
}

export const TicketStatusLabels: Record<number, string> = {
  1: 'New',
  2: 'Open',
  3: 'In Progress',
  4: 'Waiting For Customer',
  5: 'Resolved',
  6: 'Closed',
};

export const TicketPriorityLabels: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Urgent',
};
