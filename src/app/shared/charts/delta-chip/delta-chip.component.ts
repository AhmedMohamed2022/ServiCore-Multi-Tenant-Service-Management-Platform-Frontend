import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { IconComponent } from '../../ui';

/**
 * How this period compares with the one before it. Renders nothing until a
 * previous value exists, so a report with no comparison never shows a
 * placeholder. Direction is always carried by an arrow and text as well as
 * colour.
 *
 * `goodWhen` says which direction is an improvement: more resolved tickets is
 * good ('up'), more raised tickets is just a fact ('neutral').
 */
@Component({
  selector: 'sc-delta',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (view(); as v) {
      <span
        class="inline-flex h-5 items-center gap-1 rounded-full border px-1.5 text-2xs font-semibold tabular-nums"
        [class]="v.tone"
      >
        <sc-icon [name]="v.icon" size="xs" />
        <span aria-hidden="true">{{ v.text }}</span>
        <span class="sc-sr-only">{{ v.spoken }}</span>
      </span>
      <span class="ml-1.5 text-2xs text-ink-subtle" aria-hidden="true"
        >vs previous period</span
      >
    }
  `,
})
export class DeltaChipComponent {
  readonly current = input.required<number>();
  readonly previous = input<number | null | undefined>(null);
  readonly goodWhen = input<'up' | 'down' | 'neutral'>('up');

  protected readonly view = computed(() => {
    const prev = this.previous();
    const cur = this.current();
    if (prev === null || prev === undefined) return null;

    const diff = cur - prev;
    if (diff === 0) {
      return {
        icon: 'remove',
        text: 'No change',
        spoken: `No change compared with the previous period (${prev}).`,
        tone: 'bg-surface-sunken border-line-strong text-ink-muted',
      };
    }

    const up = diff > 0;
    // A jump from zero has no meaningful percentage.
    const text =
      prev === 0
        ? `+${cur}`
        : `${up ? '+' : '−'}${Math.round((Math.abs(diff) / prev) * 100)}%`;

    const good = this.goodWhen();
    const improved = good === 'neutral' ? null : good === 'up' ? up : !up;
    const tone =
      improved === null
        ? 'bg-brand-50 border-brand-200 text-brand-700'
        : improved
          ? 'bg-success-50 border-success-200 text-success-700'
          : 'bg-warn-50 border-warn-200 text-warn-700';

    return {
      icon: up ? 'arrow_upward' : 'arrow_downward',
      text,
      spoken: `${up ? 'Up' : 'Down'} ${
        prev === 0 ? cur : Math.abs(diff)
      } compared with the previous period (${prev}).`,
      tone,
    };
  });
}
