import {
  ChangeDetectionStrategy,
  Component,
  computed,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { ReportDateRangeRequest } from '../../models/reporting.model';

/** A named window over the report period. */
interface RangePreset {
  readonly key: string;
  readonly label: string;
  /** Days back from today, or null for "everything". */
  readonly days: number | null;
}

const PRESETS: readonly RangePreset[] = [
  { key: 'all', label: 'All time', days: null },
  { key: '7', label: 'Last 7 days', days: 7 },
  { key: '30', label: 'Last 30 days', days: 30 },
  { key: '90', label: 'Last 90 days', days: 90 },
  { key: '365', label: 'Last 12 months', days: 365 },
];

/**
 * The date-range control shared by all six report views.
 *
 * Every report previously carried its own copy of a bare "From / To / Filter /
 * Reset" form, which meant five duplicated date pickers and no way to ask for
 * something as ordinary as "the last 30 days" without doing the arithmetic by
 * hand. Presets cover the common cases; the custom fields stay for everything
 * else.
 *
 * Emits exactly what ReportDateRangeRequest expects — ISO strings or
 * undefined — so callers pass the payload straight to ReportingService.
 */
@Component({
  selector: 'sc-report-range',
  standalone: true,
  imports: [FormsModule, MatMenuModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="sc-btn sc-btn-secondary"
        [matMenuTriggerFor]="rangeMenu">
        <sc-icon name="date_range" size="sm" />
        {{ activeLabel() }}
        <sc-icon name="expand_more" size="sm" />
      </button>

      @if (isCustom()) {
        <div class="flex flex-wrap items-center gap-2">
          <label for="rangeFrom" class="sc-sr-only">From date</label>
          <input
            id="rangeFrom"
            type="date"
            class="sc-input w-auto"
            [ngModel]="customFrom()"
            (ngModelChange)="customFrom.set($event)" />
          <span class="text-xs text-ink-subtle">to</span>
          <label for="rangeTo" class="sc-sr-only">To date</label>
          <input
            id="rangeTo"
            type="date"
            class="sc-input w-auto"
            [ngModel]="customTo()"
            (ngModelChange)="customTo.set($event)" />
          <button
            type="button"
            class="sc-btn sc-btn-primary"
            (click)="applyCustom()">
            Apply
          </button>
        </div>
      }
    </div>

    <mat-menu #rangeMenu="matMenu">
      @for (preset of presets; track preset.key) {
        <button type="button" mat-menu-item (click)="selectPreset(preset.key)">
          <span class="flex w-full items-center justify-between gap-6 text-[13px]">
            {{ preset.label }}
            @if (activeKey() === preset.key) {
              <sc-icon name="check" size="xs" />
            }
          </span>
        </button>
      }
      <button type="button" mat-menu-item (click)="selectPreset('custom')">
        <span class="flex w-full items-center justify-between gap-6 text-[13px]">
          Custom range
          @if (activeKey() === 'custom') {
            <sc-icon name="check" size="xs" />
          }
        </span>
      </button>
    </mat-menu>
  `,
})
export class ReportRangeComponent {
  readonly rangeChange = output<ReportDateRangeRequest>();

  protected readonly presets = PRESETS;
  protected readonly activeKey = signal<string>('all');
  protected readonly customFrom = signal<string>('');
  protected readonly customTo = signal<string>('');

  protected readonly isCustom = computed(() => this.activeKey() === 'custom');

  protected readonly activeLabel = computed(() => {
    if (this.activeKey() === 'custom') return 'Custom range';
    return (
      PRESETS.find((p) => p.key === this.activeKey())?.label ?? 'All time'
    );
  });

  protected selectPreset(key: string): void {
    this.activeKey.set(key);

    if (key === 'custom') return;

    const preset = PRESETS.find((p) => p.key === key);
    if (!preset || preset.days === null) {
      this.rangeChange.emit({});
      return;
    }

    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - preset.days);

    this.rangeChange.emit({
      from: from.toISOString(),
      to: to.toISOString(),
    });
  }

  protected applyCustom(): void {
    const from = this.customFrom();
    const to = this.customTo();

    this.rangeChange.emit({
      from: from ? new Date(from).toISOString() : undefined,
      // A date input yields midnight; carry the end date to the end of its
      // day so "to 14 June" includes the whole of 14 June.
      to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
    });
  }
}
