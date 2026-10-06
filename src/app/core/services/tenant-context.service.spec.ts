import { TestBed } from '@angular/core/testing';

import { TenantContextService } from './tenant-context.service';
import { TEST_PROVIDERS } from '../../../testing/test-providers';

describe('TenantContextService', () => {
  let service: TenantContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: TEST_PROVIDERS});
    service = TestBed.inject(TenantContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
