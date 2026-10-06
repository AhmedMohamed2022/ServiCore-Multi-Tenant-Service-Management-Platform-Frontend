import { TestBed } from '@angular/core/testing';

import { InvitationService } from './invitation.service';
import { TEST_PROVIDERS } from '../../../testing/test-providers';

describe('InvitationService', () => {
  let service: InvitationService;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: TEST_PROVIDERS});
    service = TestBed.inject(InvitationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
