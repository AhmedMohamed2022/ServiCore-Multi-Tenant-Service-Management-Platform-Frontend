import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

/**
 * Providers every component and service spec needs, so each spec does not
 * have to rebuild them. HTTP is the testing backend (no real requests),
 * animations are no-ops, and the router has no routes.
 *
 *   TestBed.configureTestingModule({
 *     imports: [MyComponent],
 *     providers: TEST_PROVIDERS,
 *   });
 */
export const TEST_PROVIDERS = [
  provideHttpClient(),
  provideHttpClientTesting(),
  provideRouter([]),
  provideNoopAnimations(),
];
