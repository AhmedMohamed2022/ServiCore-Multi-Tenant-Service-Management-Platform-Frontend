import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { reportsGuard } from './reports.guard';

describe('reportsGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => reportsGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
