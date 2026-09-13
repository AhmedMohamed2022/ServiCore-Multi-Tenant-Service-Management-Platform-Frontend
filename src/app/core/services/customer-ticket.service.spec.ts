import { TestBed } from '@angular/core/testing';

import { CustomerTicketService } from './customer-ticket.service';

describe('CustomerTicketService', () => {
  let service: CustomerTicketService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomerTicketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
