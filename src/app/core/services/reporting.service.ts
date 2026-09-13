import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DashboardOverviewResponse,
  ReportDateRangeRequest,
} from '../../features/dashboard/models/reporting.model';

@Injectable({
  providedIn: 'root',
})
export class ReportingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/reports`;

  getDashboardOverview(
    filters: ReportDateRangeRequest,
  ): Observable<DashboardOverviewResponse> {
    let params = new HttpParams();
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);

    return this.http.get<any>(`${this.baseUrl}/dashboard`, { params }).pipe(
      map((res) => (res.value ? res.value : res)), // Accommodate both direct payloads or Result wraps safely
    );
  }
}
