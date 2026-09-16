import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';

/**
 * The frame every public page sits in: login, register, both invitation
 * acceptances, organization selection and portal activation.
 *
 * These six pages were the only part of the app the redesign had not reached,
 * and they were also the first thing anyone sees. Each carried its own ~150
 * line stylesheet, all of them slightly different, so the product changed
 * appearance between signing in and accepting an invitation.
 *
 * The left panel is brand context and is hidden below `lg`, where the form
 * takes the whole viewport. Nothing in it is load-bearing — the page works
 * identically without it.
 */
@Component({
  selector: 'sc-auth-layout',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <!-- Brand panel -->
      <aside class="sc-auth-brand hidden lg:flex">
        <div class="flex items-center gap-2.5">
          <span class="sc-auth-mark">
            <sc-icon name="hub" size="sm" />
          </span>
          <span class="text-[15px] font-semibold tracking-tight text-white">ServiCore</span>
        </div>

        <div class="max-w-md">
          <h1 class="text-[28px] font-semibold leading-tight tracking-tight text-white">
            Service management that keeps every ticket accounted for.
          </h1>
          <p class="mt-3 text-sm leading-relaxed text-white/70">
            Multi-tenant ticketing with team routing, agent assignment and
            reporting across your whole organization.
          </p>

          <ul class="mt-8 flex flex-col gap-3.5">
            @for (point of points; track point.label) {
              <li class="flex items-start gap-2.5">
                <span class="sc-auth-tick">
                  <sc-icon [name]="point.icon" size="xs" />
                </span>
                <span class="text-[13px] leading-relaxed text-white/80">{{ point.label }}</span>
              </li>
            }
          </ul>
        </div>

        <p class="text-xs text-white/40">
          &copy; {{ year }} ServiCore. All rights reserved.
        </p>
      </aside>

      <!-- Form panel -->
      <main class="flex items-center justify-center bg-surface-muted px-4 py-10 sm:px-8">
        <div class="w-full" [class]="wide() ? 'max-w-lg' : 'max-w-sm'">
          <!-- Repeated on small screens, where the brand panel is hidden. -->
          <div class="mb-8 flex items-center gap-2.5 lg:hidden">
            <span class="sc-auth-mark sc-auth-mark-light">
              <sc-icon name="hub" size="sm" />
            </span>
            <span class="text-[15px] font-semibold tracking-tight text-ink">ServiCore</span>
          </div>

          <div class="mb-6">
            <h2 class="text-xl font-semibold tracking-tight text-ink">{{ heading() }}</h2>
            @if (subheading()) {
              <p class="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{{ subheading() }}</p>
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

      .sc-auth-brand {
        flex-direction: column;
        justify-content: space-between;
        gap: 3rem;
        padding: 3rem;
        background: linear-gradient(
          160deg,
          var(--sc-brand-700) 0%,
          var(--sc-brand-900, #1e1b4b) 100%
        );
      }

      .sc-auth-mark {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        color: #ffffff;
        background-color: rgb(255 255 255 / 0.15);
        border-radius: var(--sc-radius);
      }

      .sc-auth-mark-light {
        color: #ffffff;
        background-color: var(--sc-brand-600);
      }

      .sc-auth-tick {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        margin-top: 1px;
        color: #ffffff;
        background-color: rgb(255 255 255 / 0.15);
        border-radius: 999px;
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
    { icon: 'confirmation_number', label: 'Ticket workflow from intake to closure, with a full audit trail.' },
    { icon: 'groups', label: 'Route work to the right team and assign the right agent.' },
    { icon: 'insights', label: 'Reporting on volume, resolution time and agent load.' },
  ];
}
