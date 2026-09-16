import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Color, ScaleType } from '@swimlane/ngx-charts';
import {
  TicketPriority,
  TicketStatus,
} from '../../features/tickets/models/ticket-enums.model';

/**
 * Chart colours are derived from the same semantic system as the status and
 * priority badges (§18), so a slice of the status chart and the badge for that
 * status are always the same colour. Hex values are needed here because
 * ngx-charts renders SVG fills it computes in JS and cannot read CSS custom
 * properties.
 */
const SC = {
  neutral: '#94a3b8',
  info: '#60a5fa',
  primary: '#4f46e5',
  warn: '#d97706',
  success: '#059669',
  closed: '#64748b',
  danger: '#dc2626',
} as const;

const scale = (domain: string[]): Color => ({
  name: 'servicore',
  selectable: true,
  group: ScaleType.Ordinal,
  domain,
});

/** Ordered New → Open → In Progress → Waiting → Resolved → Closed. */
export const STATUS_COLOR_SCHEME: Color = scale([
  SC.neutral,
  SC.info,
  SC.primary,
  SC.warn,
  SC.success,
  SC.closed,
]);

/** Ordered Low → Medium → High → Critical. */
export const PRIORITY_COLOR_SCHEME: Color = scale([
  SC.neutral,
  SC.info,
  SC.warn,
  SC.danger,
]);

/** Generic categorical scheme for category/team/agent breakdowns. */
export const CATEGORICAL_COLOR_SCHEME: Color = scale([
  '#4f46e5',
  '#0891b2',
  '#059669',
  '#d97706',
  '#db2777',
  '#7c3aed',
  '#0284c7',
  '#65a30d',
]);

export const STATUS_HEX: Record<number, string> = {
  [TicketStatus.New]: SC.neutral,
  [TicketStatus.Open]: SC.info,
  [TicketStatus.InProgress]: SC.primary,
  [TicketStatus.WaitingForCustomer]: SC.warn,
  [TicketStatus.Resolved]: SC.success,
  [TicketStatus.Closed]: SC.closed,
};

export const PRIORITY_HEX: Record<number, string> = {
  [TicketPriority.Low]: SC.neutral,
  [TicketPriority.Medium]: SC.info,
  [TicketPriority.High]: SC.warn,
  [TicketPriority.Critical]: SC.danger,
};

/**
 * Card chrome around a chart. Keeps every chart on the dashboard and reports
 * pages at a consistent height and heading weight.
 */
@Component({
  selector: 'sc-chart-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="sc-card flex h-full flex-col">
      <div class="sc-card-header">
        <div class="min-w-0">
          <h2 class="sc-card-title">{{ title() }}</h2>
          @if (description()) {
            <p class="mt-0.5 text-xs text-ink-subtle">{{ description() }}</p>
          }
        </div>
        <ng-content select="[slot=actions]" />
      </div>
      <div class="flex-1 p-3">
        <ng-content />
      </div>
    </section>
  `,
})
export class ChartCardComponent {
  readonly title = input.required<string>();
  readonly description = input<string>('');
}
