import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn } from '@angular/common/http';

import { tenantInterceptor } from './tenant.interceptor';
import { TEST_PROVIDERS } from '../../../testing/test-providers';

describe('tenantInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) => 
    TestBed.runInInjectionContext(() => tenantInterceptor(req, next));

  beforeEach(() => {
    TestBed.configureTestingModule({providers: TEST_PROVIDERS});
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });
});
