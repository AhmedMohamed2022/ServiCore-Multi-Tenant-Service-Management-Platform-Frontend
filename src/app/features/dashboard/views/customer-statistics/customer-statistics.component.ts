import { Component, computed, inject, OnInit } from '@angular/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';

import { ReportingService } from '../../../../core/services/reporting.service';
import { CustomerStatisticsData } from '../../models/reporting.model';
import { ReportViewBase, share, sumEntityTotals } from '../shared/report-base';
import { ReportRangeComponent } from '../shared/report-range.component';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { StatCardComponent } from '../../../../shared/ui/stat-card/stat-card.component';
import {
  AlertComponent,
  EmptyStateComponent,
  LoadingStateComponent,
} from '../../../../shared/ui/states/states.component';
import {
  CATEGORICAL_COLOR_SCHEME,
  ChartCardComponent,
} from '../../../../shared/charts/chart-theme';

@Component({
  selector: 'app-customer-statistics',
  standalone: true,
  imports: [
    NgxChartsModule,
    ReportRangeComponent,
    PageHeaderComponent,
    StatCardComponent,
    AlertComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    ChartCardComponent,
  ],
  templateUrl: './customer-statistics.component.html',
})
export class CustomerStatisticsComponent
  extends ReportViewBase<CustomerStatisticsData>
  implements OnInit
{
  private readonly reportingService = inject(ReportingService);

  readonly chartColors = CATEGORICAL_COLOR_SCHEME;

  readonly totals = computed(() => sumEntityTotals(this.rows()));

  /**
   * Share of tickets that reached Resolved or Closed. Both fields come
   * straight from the endpoint — nothing here is a derived "score".
   */
  readonly completionRate = computed(() => {
    const t = this.totals();
    return share(t.resolved + t.closed, t.total);
  });

  /** Top ten by volume; beyond that the bars stop being readable. */
  readonly chartData = computed(() =>
    [...this.rows()]
      .sort((a, b) => b.totalTickets - a.totalTickets)
      .slice(0, 10)
      .map((row) => ({ name: row.customerName, value: row.totalTickets })),
  );

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.beginLoad();
    this.reportingService.getCustomerStatistics(this.range()).subscribe(
      this.handle((result) =>
        this.rows.set(
          [...result].sort((a, b) => b.totalTickets - a.totalTickets),
        ),
      ),
    );
  }

  shareOf(value: number, total: number): number {
    return share(value, total);
  }
}
