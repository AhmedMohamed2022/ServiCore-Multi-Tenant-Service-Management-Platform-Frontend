import {
  SemanticTone,
  TicketPriority,
  TicketStatus,
} from '../../tickets/models/ticket-enums.model';

/**
 * Presentation helpers for the customer portal. Pure functions only: nothing
 * here talks to the API, and nothing invents data. Every value is derived from
 * fields TicketDto already carries.
 *
 * Customers read ticket state in plain language. "Waiting for Customer" is the
 * staff phrase; on the portal it is "Waiting for your reply", and it is the one
 * state that asks the customer to do something, so it is surfaced first.
 */

export type PortalStage = 'received' | 'progress' | 'resolved' | 'closed';

export interface PortalStatusView {
  label: string;
  /** One-line, customer-facing explanation of what the state means. */
  hint: string;
  tone: SemanticTone;
  icon: string;
  stage: PortalStage;
  needsReply: boolean;
  isActive: boolean;
}

const STATUS_VIEWS: Record<number, PortalStatusView> = {
  [TicketStatus.New]: {
    label: 'Received',
    hint: 'Your request is in the queue and will be picked up shortly.',
    tone: 'neutral',
    icon: 'fiber_new',
    stage: 'received',
    needsReply: false,
    isActive: true,
  },
  [TicketStatus.Open]: {
    label: 'Open',
    hint: 'Your request has been routed to the team and is waiting to be started.',
    tone: 'info',
    icon: 'radio_button_unchecked',
    stage: 'progress',
    needsReply: false,
    isActive: true,
  },
  [TicketStatus.InProgress]: {
    label: 'In progress',
    hint: 'Someone on the team is working on your request.',
    tone: 'primary',
    icon: 'progress_activity',
    stage: 'progress',
    needsReply: false,
    isActive: true,
  },
  [TicketStatus.WaitingForCustomer]: {
    label: 'Waiting for your reply',
    hint: 'The team needs more information from you before they can continue.',
    tone: 'warn',
    icon: 'schedule',
    stage: 'progress',
    needsReply: true,
    isActive: true,
  },
  [TicketStatus.Resolved]: {
    label: 'Resolved',
    hint: 'The team has marked this as resolved.',
    tone: 'success',
    icon: 'task_alt',
    stage: 'resolved',
    needsReply: false,
    isActive: false,
  },
  [TicketStatus.Closed]: {
    label: 'Closed',
    hint: 'This request is closed.',
    tone: 'neutral',
    icon: 'lock',
    stage: 'closed',
    needsReply: false,
    isActive: false,
  },
};

const UNKNOWN_STATUS: PortalStatusView = {
  label: 'Unknown',
  hint: '',
  tone: 'neutral',
  icon: 'help',
  stage: 'received',
  needsReply: false,
  isActive: false,
};

export const portalStatusView = (
  status: TicketStatus | number,
): PortalStatusView => STATUS_VIEWS[status] ?? UNKNOWN_STATUS;

const STAGE_ORDER: readonly PortalStage[] = [
  'received',
  'progress',
  'resolved',
  'closed',
];

export const stageIndex = (stage: PortalStage): number =>
  STAGE_ORDER.indexOf(stage);

/** Plain-language priority guidance for the request form. */
export interface PriorityChoice {
  value: number;
  label: string;
  hint: string;
  icon: string;
}

export const PRIORITY_CHOICES: readonly PriorityChoice[] = [
  {
    value: TicketPriority.Low,
    label: 'Low',
    hint: 'A question or a small annoyance. No rush.',
    icon: 'keyboard_arrow_down',
  },
  {
    value: TicketPriority.Medium,
    label: 'Medium',
    hint: 'Something is wrong, but you can work around it.',
    icon: 'remove',
  },
  {
    value: TicketPriority.High,
    label: 'High',
    hint: 'It is slowing you down and needs attention soon.',
    icon: 'keyboard_arrow_up',
  },
  {
    value: TicketPriority.Critical,
    label: 'Critical',
    hint: 'It is blocking your work right now.',
    icon: 'priority_high',
  },
];

/**
 * "just now", "12 min ago", "3 h ago", "yesterday", "4 days ago", then a
 * calendar date once it stops being useful as a relative figure. The absolute
 * timestamp always stays available in a `title` / <time datetime> next to it.
 */
export function relativeTime(
  iso: string | null | undefined,
  now = Date.now(),
): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const seconds = Math.round((now - then) / 1000);
  if (seconds < 45) return 'just now';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;

  return new Date(then).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year:
      new Date(then).getFullYear() === new Date(now).getFullYear()
        ? undefined
        : 'numeric',
  });
}
