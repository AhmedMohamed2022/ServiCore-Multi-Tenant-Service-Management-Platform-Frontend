import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn } from '@angular/common/http';

import { jwtInterceptor } from './jwt.interceptor';
import { TEST_PROVIDERS } from '../../../testing/test-providers';

describe('jwtInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) => 
    TestBed.runInInjectionContext(() => jwtInterceptor(req, next));

  beforeEach(() => {
    TestBed.configureTestingModule({providers: TEST_PROVIDERS});
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });
});
