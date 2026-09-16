import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  TicketPriority,
  TicketPriorityIcons,
  TicketPriorityLabels,
  TicketPriorityTones,
  TicketStatus,
  TicketStatusIcons,
  TicketStatusLabels,
  TicketStatusTones,
} from '../../features/tickets/models/ticket-enums.model';
import { IconComponent } from '../ui/icon/icon.component';

/**
 * The only places in the application allowed to render a ticket status or
 * priority. Both read their label, tone and icon from the shared maps in
 * ticket-enums.model.ts, which is what stops the six different badge styles
 * the previous build had from coming back.
 */

@Component({
  selector: 'sc-ticket-status-badge',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="sc-badge" [class]="'sc-badge-' + tone()">
      <sc-icon [name]="icon()" size="xs" />
      {{ label() }}
    </span>
  `,
})
export class TicketStatusBadgeComponent {
  readonly status = input.required<TicketStatus | number>();

  protected readonly label = computed(
    () => TicketStatusLabels[this.status()] ?? 'Unknown',
  );
  protected readonly tone = computed(
    () => TicketStatusTones[this.status()] ?? 'neutral',
  );
  protected readonly icon = computed(
    () => TicketStatusIcons[this.status()] ?? 'help',
  );
}

@Component({
  selector: 'sc-ticket-priority-badge',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="sc-badge" [class]="'sc-badge-' + tone()">
      <sc-icon [name]="icon()" size="xs" />
      {{ label() }}
    </span>
  `,
})
export class TicketPriorityBadgeComponent {
  readonly priority = input.required<TicketPriority | number>();

  protected readonly label = computed(
    () => TicketPriorityLabels[this.priority()] ?? 'Unknown',
  );
  protected readonly tone = computed(
    () => TicketPriorityTones[this.priority()] ?? 'neutral',
  );
  protected readonly icon = computed(
    () => TicketPriorityIcons[this.priority()] ?? 'help',
  );
}
