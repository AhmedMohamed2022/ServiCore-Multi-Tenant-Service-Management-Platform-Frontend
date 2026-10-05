import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';

/**
 * The frame every public page sits in: login, register, both invitation
 * acceptances, organization selection and portal activation.
 *
 * The brand panel follows the landing page's hero: a muted surface with a
 * faint grid and two soft indigo/violet glows, a pill, a gradient headline
 * and tinted icon chips. It is light on purpose, so signing in does not feel
 * like leaving the product the landing page just described.
 *
 * The panel is brand context and is hidden below `lg`, where the form takes
 * the whole viewport. Nothing in it is load-bearing: the page works
 * identically without it.
 *
 * Styling note: this component's styles are encapsulated, so they reach only
 * the markup written in this template. Projected page content (the form, the
 * alerts) is styled with the shared `sc-*` classes instead.
 */
@Component({
  selector: 'sc-auth-layout',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
    >
      <!-- Brand panel -->
      <aside class="sc-auth-brand hidden lg:flex">
        <div class="flex items-center gap-2.5">
          <img
            src="logo/logo-mark.svg"
            alt=""
            class="h-8 w-8 rounded-[9px] shadow-sc"
            width="32"
            height="32"
          />
          <span class="text-[15px] font-bold tracking-[-0.02em] text-ink"
            >ServiCore</span
          >
        </div>

        <div class="max-w-lg">
          <span class="sc-pill">
            <span class="sc-pill-dot"></span>
            Multi-tenant service management
          </span>

          <p
            class="mt-5 text-balance text-[2rem] font-bold leading-[1.12] tracking-[-0.03em] text-ink xl:text-[2.25rem]"
          >
            Service management that keeps
            <span class="sc-grad-text">every ticket accounted for.</span>
          </p>
          <p class="mt-4 text-sm leading-relaxed text-ink-muted">
            Multi-tenant ticketing with team routing, agent assignment and
            reporting across your whole organization.
          </p>

          <ul class="sc-card mt-8 divide-y divide-line shadow-sc-md">
            @for (point of points; track point.label) {
              <li class="flex items-start gap-3 px-4 py-3.5">
                <span class="sc-icon-chip sc-icon-chip-sm">
                  <sc-icon [name]="point.icon" size="sm" />
                </span>
                <span class="pt-1 text-[13px] leading-relaxed text-ink-muted">{{
                  point.label
                }}</span>
              </li>
            }
          </ul>
        </div>

        <p class="text-xs text-ink-subtle">
          &copy; {{ year }} ServiCore. All rights reserved.
        </p>
      </aside>

      <!-- Form panel -->
      <main
        class="flex items-start justify-center px-4 py-8 sm:items-center sm:px-8 sm:py-12"
      >
        <div class="sc-enter w-full" [class]="wide() ? 'max-w-lg' : 'max-w-sm'">
          <!-- Repeated on small screens, where the brand panel is hidden. -->
          <div class="mb-8 flex items-center gap-2.5 lg:hidden">
            <img
              src="logo/logo-mark.svg"
              alt=""
              class="h-8 w-8 rounded-[9px] shadow-sc"
              width="32"
              height="32"
            />
            <span class="text-[15px] font-bold tracking-[-0.02em] text-ink"
              >ServiCore</span
            >
          </div>

          <div class="mb-6">
            <h1
              class="text-[1.375rem] font-bold leading-tight tracking-[-0.025em] text-ink"
            >
              {{ heading() }}
            </h1>
            @if (subheading()) {
              <p class="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
                {{ subheading() }}
              </p>
            }
          </div>

          <ng-content />
        </div>
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      /* Painted on pseudo-elements behind the content (isolation keeps the
         negative z-index inside the panel). Glows first, grid on top, the
         grid fading out toward the lower right like the landing hero. */
      .sc-auth-brand {
        position: relative;
        isolation: isolate;
        overflow: hidden;
        flex-direction: column;
        justify-content: space-between;
        gap: 3rem;
        padding: 2.5rem 3rem;
        background: var(--sc-surface-muted);
        border-right: 1px solid var(--sc-border);
      }

      .sc-auth-brand::before,
      .sc-auth-brand::after {
        content: '';
        position: absolute;
        inset: 0;
        z-index: -1;
        pointer-events: none;
      }

      .sc-auth-brand::before {
        background:
          radial-gradient(
            440px 440px at 8% -4%,
            var(--sc-brand-200),
            transparent 70%
          ),
          radial-gradient(
            380px 380px at 100% 42%,
            var(--sc-violet-200),
            transparent 70%
          );
        opacity: 0.55;
      }

      .sc-auth-brand::after {
        background:
          linear-gradient(var(--sc-border) 1px, transparent 1px) 0 0 / 56px 56px,
          linear-gradient(90deg, var(--sc-border) 1px, transparent 1px) 0 0 /
            56px 56px;
        -webkit-mask-image: radial-gradient(
          ellipse at 25% 15%,
          var(--sc-surface-inverse) 0%,
          transparent 78%
        );
        mask-image: radial-gradient(
          ellipse at 25% 15%,
          var(--sc-surface-inverse) 0%,
          transparent 78%
        );
      }
    `,
  ],
})
export class AuthLayoutComponent {
  readonly heading = input.required<string>();
  readonly subheading = input<string>('');
  /** Wider column for pages that list things rather than take input. */
  readonly wide = input<boolean>(false);

  protected readonly year = new Date().getFullYear();

  protected readonly points = [
    {
      icon: 'confirmation_number',
      label: 'Ticket workflow from intake to closure, with a full audit trail.',
    },
    {
      icon: 'groups',
      label: 'Route work to the right team and assign the right agent.',
    },
    {
      icon: 'insights',
      label: 'Reporting on volume, resolution time and agent load.',
    },
  ];
}
