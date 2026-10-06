import { TestBed } from '@angular/core/testing';

import { CustomerService } from './customer.service';
import { TEST_PROVIDERS } from '../../../testing/test-providers';

describe('CustomerService', () => {
  let service: CustomerService;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: TEST_PROVIDERS});
    service = TestBed.inject(CustomerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
