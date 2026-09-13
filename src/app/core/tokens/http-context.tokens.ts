import { HttpContextToken } from '@angular/common/http';

/**
 * When true, instructs the standard AuthInterceptor to skip agent token injection,
 * allowing the Customer Auth Interceptor to handle the isolation layer.
 */
export const IS_CUSTOMER_PORTAL = new HttpContextToken<boolean>(() => false);
