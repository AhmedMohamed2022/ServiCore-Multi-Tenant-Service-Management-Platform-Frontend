import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
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
    <div class="flex flex-col items-center justify-center text-center px-6 py-14">
      <div
        class="flex h-11 w-11 items-center justify-center rounded-full bg-surface-sunken text-ink-subtle mb-3">
        <sc-icon [name]="icon()" />
      </div>
      <p class="text-sm font-semibold text-ink">{{ title() }}</p>
      @if (description()) {
        <p class="mt-1 text-[13px] text-ink-subtle max-w-sm">{{ description() }}</p>
      }
      @if (actionLabel()) {
        <button type="button" class="sc-btn sc-btn-primary mt-4" (click)="action.emit()">
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input<string>('inbox');
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
          aria-hidden="true"></div>
      }
    </div>
  `,
  styles: [
    `
      .sc-skeleton {
        background: linear-gradient(
          90deg,
          var(--sc-surface-sunken) 25%,
          var(--sc-surface-muted) 37%,
          var(--sc-surface-sunken) 63%
        );
        background-size: 400% 100%;
        animation: sc-shimmer 1.4s ease-in-out infinite;
      }
      @keyframes sc-shimmer {
        0% { background-position: 100% 50%; }
        100% { background-position: 0 50%; }
      }
      @media (prefers-reduced-motion: reduce) {
        .sc-skeleton { animation: none; }
      }
    `,
  ],
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
      class="flex items-start gap-2.5 rounded-sc border px-3.5 py-3 text-[13px]"
      [class]="toneClass()"
      [attr.role]="tone() === 'error' ? 'alert' : 'status'">
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
          aria-label="Dismiss message">
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
