import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';

/**
 * Password input with a show/hide toggle, plus an optional strength meter for
 * the pages where the person is choosing a password rather than recalling one.
 *
 * The strength reading is advisory; password policy enforcement stays on the
 * form control so all password-creation flows use the same backend rules.
 */
@Component({
  selector: 'sc-password-field',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label [attr.for]="inputId()" class="sc-label">{{ label() }}</label>

    <div class="relative">
      <input
        [id]="inputId()"
        [type]="isVisible() ? 'text' : 'password'"
        class="sc-input sc-input-lg pr-11 text-ellipsis"
        [formControl]="control()"
        [attr.placeholder]="placeholder()"
        [attr.autocomplete]="autocomplete()"
        [class.sc-input-invalid]="control().touched && control().invalid"
      />

      <button
        type="button"
        class="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-sc text-ink-subtle transition-colors duration-sc-fast ease-sc hover:bg-surface-sunken hover:text-ink"
        (click)="isVisible.set(!isVisible())"
        [attr.aria-label]="isVisible() ? 'Hide password' : 'Show password'"
        [attr.aria-pressed]="isVisible()"
      >
        <sc-icon
          [name]="isVisible() ? 'visibility_off' : 'visibility'"
          size="sm"
        />
      </button>
    </div>

    @if (control().touched && control().errors?.['required']) {
      <p class="sc-field-error">
        <sc-icon name="error" size="xs" /> Enter a password.
      </p>
    } @else if (control().touched && control().errors?.['minlength']) {
      <p class="sc-field-error">
        <sc-icon name="error" size="xs" /> Use at least eight characters.
      </p>
    } @else if (control().touched && control().errors?.['passwordPolicy']) {
      <p class="sc-field-error">
        <sc-icon name="error" size="xs" /> Use at least 8 characters with
        uppercase and lowercase letters, a number, and a non-alphanumeric
        character.
      </p>
    } @else if (showStrength() && control().value) {
      <div class="mt-2 flex items-center gap-2">
        <span class="sc-meter" aria-hidden="true">
          <span
            class="sc-meter-fill"
            [style.width.%]="strength().percent"
            [style.background-color]="strength().color"
          ></span>
        </span>
        <span
          class="w-16 shrink-0 text-right text-xs font-medium text-ink-muted"
          >{{ strength().label }}</span
        >
      </div>
    }
  `,
})
export class PasswordFieldComponent {
  readonly control = input.required<FormControl<string>>();
  readonly inputId = input<string>('password');
  readonly label = input<string>('Password');
  readonly placeholder = input<string>('');
  readonly autocomplete = input<string>('current-password');
  readonly showStrength = input<boolean>(false);

  protected readonly isVisible = signal<boolean>(false);

  protected readonly strength = computed(() => {
    const value = this.control().value ?? '';

    let score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 10) score++;
    if (/\p{Lu}/u.test(value) && /\p{Ll}/u.test(value)) score++;
    if (/\p{Nd}/u.test(value)) score++;
    if (/[^\p{L}\p{Nd}]/u.test(value)) score++;

    const bands = [
      { percent: 20, label: 'Very weak', color: 'var(--sc-danger-600)' },
      { percent: 40, label: 'Weak', color: 'var(--sc-danger-600)' },
      { percent: 60, label: 'Fair', color: 'var(--sc-warn-600)' },
      { percent: 80, label: 'Good', color: 'var(--sc-success-600)' },
      { percent: 100, label: 'Strong', color: 'var(--sc-success-600)' },
    ];

    return bands[Math.min(Math.max(score - 1, 0), bands.length - 1)];
  });
}
