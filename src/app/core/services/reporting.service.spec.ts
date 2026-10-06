import { TestBed } from '@angular/core/testing';

import { ReportingService } from './reporting.service';
import { TEST_PROVIDERS } from '../../../testing/test-providers';

describe('ReportingService', () => {
  let service: ReportingService;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: TEST_PROVIDERS});
    service = TestBed.inject(ReportingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
