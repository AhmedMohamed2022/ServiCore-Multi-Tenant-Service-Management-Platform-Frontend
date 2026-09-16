import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * The single icon system for the whole application (§20 of the redesign
 * brief). Every icon in ServiCore goes through this component so we never end
 * up mixing emoji, inline SVG and a font library the way the previous build
 * did.
 *
 * Icons are decorative by default — `aria-hidden` is on unless a `label` is
 * supplied, which turns the icon into a labelled image for screen readers.
 */
@Component({
  selector: 'sc-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="material-symbols-rounded"
      [class.icon-sm]="size() === 'sm'"
      [class.icon-xs]="size() === 'xs'"
      [class.icon-filled]="filled()"
      [attr.aria-hidden]="label() ? null : 'true'"
      [attr.role]="label() ? 'img' : null"
      [attr.aria-label]="label() || null"
      >{{ name() }}</span
    >
  `,
  styles: [':host { display: inline-flex; align-items: center; }'],
})
export class IconComponent {
  /** Material Symbols ligature name, e.g. `confirmation_number`. */
  readonly name = input.required<string>();
  readonly size = input<'xs' | 'sm' | 'md'>('md');
  readonly filled = input(false);
  /** Supply only when the icon carries meaning no adjacent text conveys. */
  readonly label = input<string | null>(null);

  protected readonly resolved = computed(() => this.name());
}
