import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * The three states every data-driven view needs. They live in one file because
 * they are always used together and splitting them would mean three imports on
 * every page for no benefit.
 */

@Component({
  selector: 'sc-empty-state',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="sc-enter flex flex-col items-center justify-center text-center px-6 py-14"
      [attr.role]="tone() === 'error' ? 'alert' : null"
    >
      <div
        class="sc-icon-chip h-12 w-12 rounded-sc-lg shadow-sc mb-4"
        [class.sc-icon-chip-neutral]="tone() === 'neutral'"
        [class.sc-icon-chip-danger]="tone() === 'error'"
      >
        <sc-icon [name]="icon()" />
      </div>
      <p class="text-sm font-semibold tracking-[-0.011em] text-ink">
        {{ title() }}
      </p>
      @if (description()) {
        <p class="mt-1 text-[13px] text-ink-subtle max-w-sm">
          {{ description() }}
        </p>
      }
      @if (actionLabel()) {
        <button
          type="button"
          class="sc-btn sc-btn-primary mt-4"
          (click)="action.emit()"
        >
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input<string>('inbox');
  /**
   * Chip colour, so the three kinds of empty read differently at a glance:
   *   brand   (default) nothing here yet, or a prompt to pick something
   *   neutral           a search or filter matched nothing (use `search_off`)
   *   error             the data could not be loaded (use `cloud_off`)
   */
  readonly tone = input<'brand' | 'neutral' | 'error'>('brand');
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly actionLabel = input<string>('');
  readonly action = output<void>();
}

@Component({
  selector: 'sc-loading-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="px-1 py-2" role="status" [attr.aria-label]="label()">
      <span class="sc-sr-only">{{ label() }}</span>
      @for (row of rows(); track $index) {
        <div
          class="sc-skeleton mb-2.5 h-[38px] rounded-sc"
          [style.opacity]="1 - $index * 0.12"
          aria-hidden="true"
        ></div>
      }
    </div>
  `,
})
export class LoadingStateComponent {
  readonly label = input<string>('Loading');
  readonly count = input<number>(5);
  protected rows = () => Array.from({ length: this.count() });
}

@Component({
  selector: 'sc-alert',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex items-start gap-2.5 rounded-sc-md border px-3.5 py-3 text-[13px]"
      [class]="toneClass()"
      [attr.role]="tone() === 'error' ? 'alert' : 'status'"
    >
      <sc-icon [name]="toneIcon()" size="sm" class="mt-px" />
      <div class="min-w-0 flex-1">
        @if (title()) {
          <p class="font-semibold">{{ title() }}</p>
        }
        <p [class.mt-0.5]="title()"><ng-content /></p>
      </div>
      @if (dismissible()) {
        <button
          type="button"
          class="sc-btn sc-btn-ghost sc-btn-sm sc-btn-icon -my-1 -mr-1.5"
          (click)="dismiss.emit()"
          aria-label="Dismiss message"
        >
          <sc-icon name="close" size="sm" />
        </button>
      }
    </div>
  `,
})
export class AlertComponent {
  readonly tone = input<'error' | 'warn' | 'success' | 'info'>('error');
  readonly title = input<string>('');
  readonly dismissible = input(false);
  readonly dismiss = output<void>();

  protected toneClass = () =>
    ({
      error: 'bg-danger-50 border-danger-200 text-danger-700',
      warn: 'bg-warn-50 border-warn-200 text-warn-700',
      success: 'bg-success-50 border-success-200 text-success-700',
      info: 'bg-brand-50 border-brand-200 text-brand-700',
    })[this.tone()];

  protected toneIcon = () =>
    ({
      error: 'error',
      warn: 'warning',
      success: 'check_circle',
      info: 'info',
    })[this.tone()];
}
