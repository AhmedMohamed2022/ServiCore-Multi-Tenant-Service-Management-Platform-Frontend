import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ReportingService } from '../services/reporting.service';

// Route-level guard for /app/dashboard and /app/reports/*, both gated
// server-side by CanViewReports (Owner/Manager only — Agent is deliberately
// excluded). Rather than trusting a cached role or reusing a different
// policy's probe, this asks the server directly using an endpoint under the
// exact same policy: a 200 means we're allowed, a 403 means we're not.
export const reportsGuard: CanActivateFn = () => {
  const reportingService = inject(ReportingService);
  const router = inject(Router);

  return reportingService.getDashboardOverview({}).pipe(
    map(() => true),
    catchError(() => {
      router.navigate(['/app/tickets']);
      return of(false);
    }),
  );
};
