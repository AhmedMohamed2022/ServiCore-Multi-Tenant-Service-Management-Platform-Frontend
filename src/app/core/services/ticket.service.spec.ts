import { TestBed } from '@angular/core/testing';

import { TicketService } from './ticket.service';
import { TEST_PROVIDERS } from '../../../testing/test-providers';

describe('TicketService', () => {
  let service: TicketService;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: TEST_PROVIDERS});
    service = TestBed.inject(TicketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
