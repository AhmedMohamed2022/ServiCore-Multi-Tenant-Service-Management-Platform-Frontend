import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
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
      class="sc-card flex items-start gap-3 p-4 transition-shadow"
      [class.hover:shadow-sc-md]="interactive()"
      [class.cursor-pointer]="interactive()">
      <span
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-sc"
        [class]="toneClass()">
        <sc-icon [name]="icon()" size="sm" />
      </span>

      <div class="min-w-0 flex-1">
        <p class="text-2xs font-semibold uppercase tracking-wider text-ink-subtle">
          {{ label() }}
        </p>
        <p class="mt-0.5 text-[22px] font-semibold leading-tight text-ink tabular-nums">
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
  readonly tone = input<'neutral' | 'info' | 'primary' | 'success' | 'warn' | 'danger'>(
    'neutral',
  );
  readonly interactive = input(false);

  protected readonly toneClass = computed(
    () =>
      ({
        neutral: 'bg-surface-sunken text-ink-muted',
        info: 'bg-brand-50 text-brand-700',
        primary: 'bg-brand-600 text-white',
        success: 'bg-success-50 text-success-700',
        warn: 'bg-warn-50 text-warn-700',
        danger: 'bg-danger-50 text-danger-700',
      })[this.tone()],
  );
}
