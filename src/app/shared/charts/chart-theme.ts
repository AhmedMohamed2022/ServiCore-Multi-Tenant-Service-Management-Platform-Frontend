import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  TicketPriority,
  TicketStatus,
} from '../../features/tickets/models/ticket-enums.model';

/**
 * Chart colours are the same design tokens the status and priority badges use,
 * so a slice of the status ring and the badge for that status are always the
 * same colour. Every value is a CSS custom property reference: the charts are
 * HTML and SVG that the browser paints, so they read tokens directly and
 * there is no hex in TypeScript any more.
 */
export const STATUS_COLOR: Record<number, string> = {
  [TicketStatus.New]: 'var(--sc-status-new)',
  [TicketStatus.Open]: 'var(--sc-status-open)',
  [TicketStatus.InProgress]: 'var(--sc-status-progress)',
  [TicketStatus.WaitingForCustomer]: 'var(--sc-status-waiting)',
  [TicketStatus.Resolved]: 'var(--sc-status-resolved)',
  [TicketStatus.Closed]: 'var(--sc-status-closed)',
};

export const PRIORITY_COLOR: Record<number, string> = {
  [TicketPriority.Low]: 'var(--sc-priority-low)',
  [TicketPriority.Medium]: 'var(--sc-priority-medium)',
  [TicketPriority.High]: 'var(--sc-priority-high)',
  [TicketPriority.Critical]: 'var(--sc-priority-critical)',
};

/**
 * The three states a ticket can be summarised into on the per-entity reports.
 * Active is the brand colour (live work), Resolved the success green and
 * Closed the same slate as the Closed status.
 */
export const COMPOSITION_COLOR = {
  active: 'var(--sc-brand-600)',
  resolved: 'var(--sc-success-600)',
  closed: 'var(--sc-status-closed)',
} as const;

/** @deprecated Kept so older imports keep compiling; use STATUS_COLOR. */
export const STATUS_HEX = STATUS_COLOR;
/** @deprecated Kept so older imports keep compiling; use PRIORITY_COLOR. */
export const PRIORITY_HEX = PRIORITY_COLOR;

/**
 * Card chrome around a chart. Keeps every chart on the reports pages at a
 * consistent heading weight and padding.
 *
 *   <sc-chart-card title="Volume" description="Per day" eyebrow="Trend">
 *     <button slot="actions">…</button>
 *     …chart…
 *   </sc-chart-card>
 */
@Component({
  selector: 'sc-chart-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="sc-card sc-enter flex h-full min-w-0 flex-col">
      <div class="sc-card-header flex-wrap">
        <div class="min-w-0">
          @if (eyebrow()) {
            <p class="sc-eyebrow mb-1 !text-2xs">{{ eyebrow() }}</p>
          }
          <h2 class="sc-card-title">{{ title() }}</h2>
          @if (description()) {
            <p class="mt-0.5 text-xs text-ink-subtle">{{ description() }}</p>
          }
        </div>
        <ng-content select="[slot=actions]" />
      </div>
      <div class="min-w-0 flex-1 p-4 sm:p-5">
        <ng-content />
      </div>
    </section>
  `,
  styles: [':host { display: block; min-width: 0; }'],
})
export class ChartCardComponent {
  readonly title = input.required<string>();
  readonly description = input<string>('');
  /** Optional small uppercase label above the title. */
  readonly eyebrow = input<string>('');
}
