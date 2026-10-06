import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { TEST_PROVIDERS } from '../../../../testing/test-providers';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: TEST_PROVIDERS});
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
