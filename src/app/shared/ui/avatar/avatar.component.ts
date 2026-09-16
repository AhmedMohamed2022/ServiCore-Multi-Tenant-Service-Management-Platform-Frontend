import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Initials avatar. There is no avatar image anywhere in the backend contract,
 * so this derives initials and a stable tint from whatever identifier we have
 * — deterministic, so the same person keeps the same colour across the app.
 */
@Component({
  selector: 'sc-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none"
      [class]="sizeClass()"
      [style.background-color]="tint().bg"
      [style.color]="tint().fg"
      aria-hidden="true">
      {{ initials() }}
    </span>
  `,
})
export class AvatarComponent {
  /** Display name, email, or any stable identifier. */
  readonly name = input<string | null | undefined>('');
  readonly size = input<'xs' | 'sm' | 'md'>('sm');

  protected readonly initials = computed(() => {
    const raw = (this.name() ?? '').trim();
    if (!raw) return '?';

    // Emails rarely have a usable second word, so take the local part only.
    const source = raw.includes('@') ? raw.split('@')[0] : raw;
    const words = source.split(/[\s._-]+/).filter(Boolean);

    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  });

  protected readonly sizeClass = computed(
    () =>
      ({
        xs: 'h-6 w-6 text-[10px]',
        sm: 'h-8 w-8 text-[11px]',
        md: 'h-10 w-10 text-[13px]',
      })[this.size()],
  );

  private static readonly PALETTE = [
    { bg: '#e0e7ff', fg: '#4338ca' },
    { bg: '#ccfbf1', fg: '#0f766e' },
    { bg: '#fef3c7', fg: '#b45309' },
    { bg: '#fce7f3', fg: '#be185d' },
    { bg: '#dbeafe', fg: '#1d4ed8' },
    { bg: '#dcfce7', fg: '#15803d' },
  ];

  protected readonly tint = computed(() => {
    const key = (this.name() ?? '').trim().toLowerCase();
    if (!key) return { bg: 'var(--sc-surface-sunken)', fg: 'var(--sc-text-subtle)' };

    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }
    return AvatarComponent.PALETTE[hash % AvatarComponent.PALETTE.length];
  });
}
