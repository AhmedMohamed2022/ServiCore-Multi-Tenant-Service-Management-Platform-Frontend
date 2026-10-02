import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const passwordPolicyValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = typeof control.value === 'string' ? control.value : '';
  const meetsPolicy =
    password.length >= 8 &&
    /\p{Ll}/u.test(password) &&
    /\p{Lu}/u.test(password) &&
    /\p{Nd}/u.test(password) &&
    /[^\p{L}\p{Nd}]/u.test(password);

  return meetsPolicy ? null : { passwordPolicy: true };
};
