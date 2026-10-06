import { TestBed } from '@angular/core/testing';

import { OrganizationService } from './organization.service';
import { TEST_PROVIDERS } from '../../../testing/test-providers';

describe('OrganizationService', () => {
  let service: OrganizationService;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: TEST_PROVIDERS});
    service = TestBed.inject(OrganizationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
