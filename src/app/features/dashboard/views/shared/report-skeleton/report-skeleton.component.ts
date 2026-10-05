import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Loading placeholder that mirrors a report page: a row of KPI tiles, then
 * either two cards side by side or one wide card. Sized like the real thing,
 * so content landing does not shove the page around.
 */
@Component({
  selector: 'sc-report-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="status" aria-live="polite" [attr.aria-label]="label()">
      <span class="sc-sr-only">{{ label() }}</span>

      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden="true">
        @for (n of tiles; track n) {
          <div class="sc-card flex min-h-[92px] items-start gap-3 p-4">
            <div class="sc-skeleton h-9 w-9 shrink-0 rounded-sc-md"></div>
            <div class="min-w-0 flex-1 pt-0.5">
              <div class="sc-skeleton h-2.5 w-16 rounded-full"></div>
              <div class="sc-skeleton mt-2.5 h-5 w-14 rounded-sc-sm"></div>
              <div class="sc-skeleton mt-2.5 h-2.5 w-24 rounded-full"></div>
            </div>
          </div>
        }
      </div>

      <div
        class="mt-4 grid grid-cols-1 gap-4"
        [class.xl:grid-cols-2]="layout() === 'split'"
        aria-hidden="true"
      >
        @for (n of cards(); track n) {
          <div class="sc-card overflow-hidden">
            <div class="sc-card-header">
              <div>
                <div class="sc-skeleton h-3.5 w-32 rounded-full"></div>
                <div class="sc-skeleton mt-2 h-2.5 w-48 rounded-full"></div>
              </div>
            </div>
            <div
              class="flex flex-col gap-4 p-5"
              [style.min-height.px]="bodyHeight()"
            >
              @for (row of rows; track row) {
                <div class="flex items-center gap-3">
                  <div class="sc-skeleton h-3 w-4 shrink-0 rounded-full"></div>
                  <div class="min-w-0 flex-1">
                    <div
                      class="sc-skeleton h-2.5 rounded-full"
                      [style.width.%]="70 - row * 6"
                    ></div>
                    <div
                      class="sc-skeleton mt-2 h-2 rounded-full"
                      [style.width.%]="92 - row * 9"
                    ></div>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [':host { display: block; }'],
})
export class ReportSkeletonComponent {
  readonly label = input<string>('Loading report');
  readonly layout = input<'split' | 'wide'>('split');
  /** Height of the card body, to match the real chart/table. */
  readonly bodyHeight = input<number>(380);
  readonly cards = () => (this.layout() === 'split' ? [0, 1] : [0]);

  protected readonly tiles = [0, 1, 2, 3];
  protected readonly rows = [0, 1, 2, 3, 4, 5];
}
