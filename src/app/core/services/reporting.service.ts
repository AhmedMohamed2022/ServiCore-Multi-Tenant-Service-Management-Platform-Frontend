import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AgentStatisticsData,
  CategoryStatisticsData,
  CustomerStatisticsData,
  DashboardOverviewResponse,
  ReportDateRangeRequest,
  TeamStatisticsData,
  TicketStatisticsResponse,
  TicketTimeSeriesPointData,
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
    return this.http
      .get<any>(`${this.baseUrl}/dashboard`, {
        params: this.buildParams(filters),
      })
      .pipe(map((res) => (res.value ? res.value : res))); // Accommodate both direct payloads or Result wraps safely
  }

  // GET /reports/tickets — status/priority/category distributions + performance
  getTicketStatistics(
    filters: ReportDateRangeRequest,
  ): Observable<TicketStatisticsResponse> {
    return this.http.get<TicketStatisticsResponse>(`${this.baseUrl}/tickets`, {
      params: this.buildParams(filters),
    });
  }

  // GET /reports/teams — per-team ticket totals, for a team-performance view
  getTeamStatistics(
    filters: ReportDateRangeRequest,
  ): Observable<TeamStatisticsData[]> {
    return this.http.get<TeamStatisticsData[]>(`${this.baseUrl}/teams`, {
      params: this.buildParams(filters),
    });
  }

  // GET /reports/agents — per-agent ticket totals, for an agent leaderboard
  getAgentStatistics(
    filters: ReportDateRangeRequest,
  ): Observable<AgentStatisticsData[]> {
    return this.http.get<AgentStatisticsData[]>(`${this.baseUrl}/agents`, {
      params: this.buildParams(filters),
    });
  }

  // GET /reports/customers — per-customer ticket totals
  getCustomerStatistics(
    filters: ReportDateRangeRequest,
  ): Observable<CustomerStatisticsData[]> {
    return this.http.get<CustomerStatisticsData[]>(
      `${this.baseUrl}/customers`,
      {
        params: this.buildParams(filters),
      },
    );
  }

  // GET /reports/categories — per-category ticket totals
  getCategoryStatistics(
    filters: ReportDateRangeRequest,
  ): Observable<CategoryStatisticsData[]> {
    return this.http.get<CategoryStatisticsData[]>(
      `${this.baseUrl}/categories`,
      {
        params: this.buildParams(filters),
      },
    );
  }

  // GET /reports/tickets/time-series — daily ticket volume, for a trend chart
  getTicketTimeSeries(
    filters: ReportDateRangeRequest,
  ): Observable<TicketTimeSeriesPointData[]> {
    return this.http.get<TicketTimeSeriesPointData[]>(
      `${this.baseUrl}/tickets/time-series`,
      { params: this.buildParams(filters) },
    );
  }

  private buildParams(filters: ReportDateRangeRequest): HttpParams {
    let params = new HttpParams();
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    return params;
  }
}
