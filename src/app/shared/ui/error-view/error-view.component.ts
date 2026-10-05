import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * Full-page status view: 401 / 403 / 404 / 500-style failures, and the
 * "couldn't load this part of the app" view. One layout and one voice so every
 * dead end in the application looks and reads the same.
 *
 * Presentation only. The caller supplies the heading level through the page
 * it lives in (this component always renders the single <h1>), and the
 * actions through content projection:
 *
 *   <sc-error-view code="404" title="…" message="…">
 *     <a class="sc-btn sc-btn-primary" routerLink="/">Go home</a>
 *   </sc-error-view>
 */
@Component({
  selector: 'sc-error-view',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sc-error-view sc-enter">
      <div class="sc-icon-chip sc-icon-chip-lg" [class]="chipClass()">
        <sc-icon [name]="icon()" />
      </div>
      @if (code()) {
        <p class="sc-eyebrow mt-5">{{ code() }}</p>
      }
      <h1 [id]="headingId()" class="sc-error-view-title">{{ title() }}</h1>
      <p class="sc-error-view-message">{{ message() }}</p>
      <div class="sc-error-view-actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .sc-error-view {
        display: flex;
        flex-direction: column;
        align-items: center;
        max-width: 28rem;
        margin: 0 auto;
        padding: 2rem 1.5rem;
        text-align: center;
      }
      .sc-error-view-title {
        margin-top: 0.5rem;
        font-size: 1.5rem;
        line-height: 2rem;
        overflow-wrap: anywhere;
      }
      .sc-error-view-message {
        margin-top: 0.5rem;
        font-size: 0.875rem;
        line-height: 1.5rem;
        color: var(--sc-text-muted);
        overflow-wrap: anywhere;
      }
      .sc-error-view-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.5rem;
        margin-top: 1.5rem;
      }
    `,
  ],
})
export class ErrorViewComponent {
  /** Short status label shown above the heading, e.g. "404". */
  readonly code = input<string>('');
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly icon = input<string>('explore_off');
  /** `brand` for "nothing here", `danger` for a failure. */
  readonly tone = input<'brand' | 'danger'>('brand');
  /** Lets a host (for example a dialog) reference the heading by id. */
  readonly headingId = input<string | null>(null);

  protected chipClass = () =>
    this.tone() === 'danger' ? 'sc-icon-chip-danger' : '';
}
