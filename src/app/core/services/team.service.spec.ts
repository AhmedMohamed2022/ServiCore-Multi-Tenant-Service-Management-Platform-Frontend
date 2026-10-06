import { TestBed } from '@angular/core/testing';

import { TeamService } from './team.service';
import { TEST_PROVIDERS } from '../../../testing/test-providers';

describe('TeamService', () => {
  let service: TeamService;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: TEST_PROVIDERS});
    service = TestBed.inject(TeamService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
