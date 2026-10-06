import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { managementGuard } from './management.guard';
import { TEST_PROVIDERS } from '../../../testing/test-providers';

describe('managementGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => managementGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({providers: TEST_PROVIDERS});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
