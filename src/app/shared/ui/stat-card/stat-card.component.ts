import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * The KPI tile used by the dashboard and the report views. Values are always
 * rendered with their label and icon, so a number is never left to be
 * interpreted from colour alone.
 */
@Component({
  selector: 'sc-stat-card',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="sc-card flex items-start gap-3 p-4"
      [class.sc-card-interactive]="interactive()"
      [class.cursor-pointer]="interactive()"
    >
      <span class="sc-icon-chip" [class]="toneClass()">
        <sc-icon [name]="icon()" size="sm" />
      </span>

      <div class="min-w-0 flex-1">
        <p
          class="text-2xs font-semibold uppercase tracking-wider text-ink-subtle"
        >
          {{ label() }}
        </p>
        <p
          class="mt-0.5 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink tabular-nums"
        >
          {{ value() }}
        </p>
        @if (hint()) {
          <p class="mt-0.5 truncate text-xs text-ink-subtle">{{ hint() }}</p>
        }
      </div>
    </div>
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input<string>('analytics');
  readonly hint = input<string>('');
  readonly tone = input<
    'neutral' | 'info' | 'primary' | 'success' | 'warn' | 'danger'
  >('neutral');
  readonly interactive = input(false);

  /** Modifier on top of the base `sc-icon-chip` (the brand tint is the default). */
  protected readonly toneClass = computed(
    () =>
      ({
        neutral: 'sc-icon-chip-neutral',
        info: '',
        primary: 'sc-icon-chip-solid',
        success: 'sc-icon-chip-success',
        warn: 'sc-icon-chip-warn',
        danger: 'sc-icon-chip-danger',
      })[this.tone()],
  );
}
