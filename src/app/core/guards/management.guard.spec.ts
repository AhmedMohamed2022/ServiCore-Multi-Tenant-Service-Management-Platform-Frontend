import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { managementGuard } from './management.guard';

describe('managementGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => managementGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
