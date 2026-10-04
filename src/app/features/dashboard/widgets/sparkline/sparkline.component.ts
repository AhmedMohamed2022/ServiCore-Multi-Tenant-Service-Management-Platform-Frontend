import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { Pt, areaPath, downsample, monotonePath } from '../chart-math';

let nextId = 0;

/**
 * A tiny trend line for KPI tiles. Decorative: the tile always prints the
 * number itself, so the sparkline is hidden from assistive technology.
 * Colours come from tokens via the stylesheet, never from the template.
 */
@Component({
  selector: 'app-sparkline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="sp-svg"
      [class.sp-success]="tone() === 'success'"
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      @if (geometry(); as g) {
        <defs>
          <linearGradient [attr.id]="gradId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" class="sp-stop-top" />
            <stop offset="1" class="sp-stop-bottom" />
          </linearGradient>
        </defs>
        <path
          class="sp-area"
          [attr.d]="g.area"
          [attr.fill]="'url(#' + gradId + ')'"
        />
        <path class="sp-line" [attr.d]="g.line" />
      }
    </svg>
  `,
  styleUrls: ['./sparkline.component.css'],
})
export class SparklineComponent {
  readonly values = input.required<readonly number[]>();
  readonly tone = input<'brand' | 'success'>('brand');

  protected readonly gradId = `sp-grad-${nextId++}`;

  protected readonly geometry = computed(() => {
    const v = downsample(this.values(), 48);
    if (v.length < 2) return null;

    const min = Math.min(...v);
    const max = Math.max(...v);
    const span = max - min || 1;
    // 3px of headroom top and bottom so the stroke is never clipped.
    const pts: Pt[] = v.map((value, i) => ({
      x: (i / (v.length - 1)) * 100,
      y: 29 - ((value - min) / span) * 26,
    }));
    const line = monotonePath(pts);
    return { line, area: areaPath(line, pts, 32) };
  });
}
