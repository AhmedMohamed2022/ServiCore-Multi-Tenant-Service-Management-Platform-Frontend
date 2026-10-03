import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon.component';

export interface Breadcrumb {
  label: string;
  link?: string;
}

/**
 * Standard page heading used by every routed page so titles, descriptions and
 * primary actions sit in the same place throughout the app.
 *
 * Project actions into `[slot=actions]`:
 *   <sc-page-header title="Tickets">
 *     <button slot="actions" class="sc-btn sc-btn-primary">New ticket</button>
 *   </sc-page-header>
 */
@Component({
  selector: 'sc-page-header',
  standalone: true,
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sc-enter mb-5">
      @if (breadcrumbs().length) {
        <nav aria-label="Breadcrumb" class="mb-2.5">
          <ol
            class="flex flex-wrap items-center gap-1.5 text-xs text-ink-subtle"
          >
            @for (crumb of breadcrumbs(); track crumb.label; let last = $last) {
              <li class="flex items-center gap-1.5">
                @if (crumb.link && !last) {
                  <a
                    [routerLink]="crumb.link"
                    class="rounded-sc-sm font-medium transition-colors duration-sc-fast ease-sc hover:text-brand-600 hover:underline underline-offset-2"
                  >
                    {{ crumb.label }}
                  </a>
                } @else {
                  <span
                    [attr.aria-current]="last ? 'page' : null"
                    class="font-semibold text-ink-muted"
                  >
                    {{ crumb.label }}
                  </span>
                }
                @if (!last) {
                  <sc-icon
                    name="chevron_right"
                    size="xs"
                    class="text-line-strong"
                  />
                }
              </li>
            }
          </ol>
        </nav>
      }

      <div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div class="min-w-0">
          <h1
            class="truncate text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink"
          >
            {{ title() }}
          </h1>
          @if (description()) {
            <p
              class="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-ink-muted"
            >
              {{ description() }}
            </p>
          }
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ng-content select="[slot=actions]" />
        </div>
      </div>

      <ng-content />
    </header>
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly breadcrumbs = input<Breadcrumb[]>([]);
}
