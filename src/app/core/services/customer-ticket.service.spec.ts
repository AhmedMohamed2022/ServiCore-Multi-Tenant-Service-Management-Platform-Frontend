import { TestBed } from '@angular/core/testing';

import { CustomerTicketService } from './customer-ticket.service';
import { TEST_PROVIDERS } from '../../../testing/test-providers';

describe('CustomerTicketService', () => {
  let service: CustomerTicketService;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: TEST_PROVIDERS});
    service = TestBed.inject(CustomerTicketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
