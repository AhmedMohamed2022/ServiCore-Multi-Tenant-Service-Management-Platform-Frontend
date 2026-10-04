import { DOCUMENT } from '@angular/common';
import {
  Directive,
  ElementRef,
  NgZone,
  OnDestroy,
  effect,
  inject,
  input,
} from '@angular/core';

/**
 * Counts a number up from its previous value on first render and on every
 * change. Writes straight to the element's text, outside Angular's zone, so
 * the animation costs no change-detection passes. Under
 * `prefers-reduced-motion` the final value is written immediately.
 */
@Directive({
  selector: '[appCountUp]',
  standalone: true,
})
export class CountUpDirective implements OnDestroy {
  readonly appCountUp = input.required<number>();

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly doc = inject(DOCUMENT);

  private shown = 0;
  private frame = 0;

  constructor() {
    effect(() => {
      const target = this.appCountUp();
      this.run(Number.isFinite(target) ? target : 0);
    });
  }

  ngOnDestroy(): void {
    this.cancel();
  }

  private run(target: number): void {
    this.cancel();

    const win = this.doc.defaultView;
    const reduce = win?.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (!win || reduce || target === this.shown) {
      this.write(target);
      return;
    }

    const from = this.shown;
    const duration = 700;
    const start = win.performance.now();

    this.zone.runOutsideAngular(() => {
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        this.write(from + (target - from) * eased);
        if (p < 1) this.frame = win.requestAnimationFrame(tick);
      };
      this.frame = win.requestAnimationFrame(tick);
    });
  }

  private write(value: number): void {
    this.shown = value;
    this.el.nativeElement.textContent = Math.round(value).toLocaleString();
  }

  private cancel(): void {
    if (this.frame) this.doc.defaultView?.cancelAnimationFrame(this.frame);
    this.frame = 0;
  }
}
