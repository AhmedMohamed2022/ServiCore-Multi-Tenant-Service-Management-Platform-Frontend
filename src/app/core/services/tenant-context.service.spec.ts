import { TestBed } from '@angular/core/testing';

import { TenantContextService } from './tenant-context.service';

describe('TenantContextService', () => {
  let service: TenantContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TenantContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
