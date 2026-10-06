import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { reportsGuard } from './reports.guard';
import { TEST_PROVIDERS } from '../../../testing/test-providers';

describe('reportsGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => reportsGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({providers: TEST_PROVIDERS});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
