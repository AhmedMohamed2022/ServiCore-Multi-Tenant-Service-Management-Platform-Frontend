/// <reference types="jasmine" />

import { FormControl } from '@angular/forms';
import { passwordPolicyValidator } from './password.validators';

describe('passwordPolicyValidator', () => {
  it('accepts a password that meets the backend policy', () => {
    expect(passwordPolicyValidator(new FormControl('Abcdef1!'))).toBeNull();
  });

  it('rejects passwords that miss any backend requirement', () => {
    const invalidPasswords = [
      'Abc1!',
      'abcdefg1!',
      'ABCDEFG1!',
      'Abcdefgh!',
      'Abcdefg1',
    ];

    for (const password of invalidPasswords) {
      expect(passwordPolicyValidator(new FormControl(password))).toEqual({
        passwordPolicy: true,
      });
    }
  });
});
