import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
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
  /** Compact label for the segmented variant. */
  readonly short: string;
  /** Days back from today, or null for "everything". */
  readonly days: number | null;
}

const PRESETS: readonly RangePreset[] = [
  { key: 'all', label: 'All time', short: 'All', days: null },
  { key: '7', label: 'Last 7 days', short: '7D', days: 7 },
  { key: '30', label: 'Last 30 days', short: '30D', days: 30 },
  { key: '90', label: 'Last 90 days', short: '90D', days: 90 },
  { key: '365', label: 'Last 12 months', short: '12M', days: 365 },
];

/**
 * The date-range control shared by the dashboard and all six report views.
 *
 * Two looks, one behaviour:
 *  - `menu` (default): a single button that opens a menu. Compact, used in the
 *    dashboard hero.
 *  - `segmented`: every preset visible as one tap. Used on the report pages,
 *    where the range is the main thing you change.
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
      @if (variant() === 'segmented') {
        <div
          role="group"
          aria-label="Date range"
          class="inline-flex items-center gap-0.5 rounded-sc-md border border-line bg-surface-sunken p-0.5"
        >
          @for (preset of presets; track preset.key) {
            <button
              type="button"
              class="h-8 min-w-[2.5rem] rounded-sc-sm px-2.5 text-xs font-semibold text-ink-muted transition-colors duration-sc-fast ease-sc hover:text-ink aria-pressed:bg-surface aria-pressed:text-brand-700 aria-pressed:shadow-sc"
              [attr.aria-pressed]="activeKey() === preset.key"
              [attr.aria-label]="preset.label"
              [attr.title]="preset.label"
              (click)="selectPreset(preset.key)"
            >
              {{ preset.short }}
            </button>
          }
          <button
            type="button"
            class="inline-flex h-8 items-center gap-1 rounded-sc-sm px-2.5 text-xs font-semibold text-ink-muted transition-colors duration-sc-fast ease-sc hover:text-ink aria-pressed:bg-surface aria-pressed:text-brand-700 aria-pressed:shadow-sc"
            [attr.aria-pressed]="activeKey() === 'custom'"
            aria-label="Custom range"
            (click)="selectPreset('custom')"
          >
            <sc-icon name="date_range" size="xs" />
            Custom
          </button>
        </div>
      } @else {
        <button
          type="button"
          class="sc-btn sc-btn-secondary"
          [matMenuTriggerFor]="rangeMenu"
        >
          <sc-icon name="date_range" size="sm" />
          {{ activeLabel() }}
          <sc-icon name="expand_more" size="sm" />
        </button>
      }

      @if (isCustom()) {
        <div class="flex flex-wrap items-center gap-2">
          <label for="rangeFrom" class="sc-sr-only">From date</label>
          <input
            id="rangeFrom"
            type="date"
            class="sc-input w-auto"
            [ngModel]="customFrom()"
            (ngModelChange)="customFrom.set($event)"
          />
          <span class="text-xs text-ink-subtle">to</span>
          <label for="rangeTo" class="sc-sr-only">To date</label>
          <input
            id="rangeTo"
            type="date"
            class="sc-input w-auto"
            [ngModel]="customTo()"
            (ngModelChange)="customTo.set($event)"
          />
          <button
            type="button"
            class="sc-btn sc-btn-primary"
            (click)="applyCustom()"
          >
            Apply
          </button>
        </div>
      }
    </div>

    <mat-menu #rangeMenu="matMenu" class="sc-menu">
      @for (preset of presets; track preset.key) {
        <button type="button" mat-menu-item (click)="selectPreset(preset.key)">
          <span
            class="flex w-full items-center justify-between gap-6 text-[13px]"
          >
            {{ preset.label }}
            @if (activeKey() === preset.key) {
              <sc-icon name="check" size="xs" />
            }
          </span>
        </button>
      }
      <button type="button" mat-menu-item (click)="selectPreset('custom')">
        <span
          class="flex w-full items-center justify-between gap-6 text-[13px]"
        >
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
  readonly variant = input<'menu' | 'segmented'>('menu');

  protected readonly presets = PRESETS;
  protected readonly activeKey = signal<string>('all');
  protected readonly customFrom = signal<string>('');
  protected readonly customTo = signal<string>('');

  protected readonly isCustom = computed(() => this.activeKey() === 'custom');

  protected readonly activeLabel = computed(() => {
    if (this.activeKey() === 'custom') return 'Custom range';
    return PRESETS.find((p) => p.key === this.activeKey())?.label ?? 'All time';
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
