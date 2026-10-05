import { Component, computed, inject, OnInit } from '@angular/core';

import { ReportingService } from '../../../../core/services/reporting.service';
import { CustomerStatisticsData } from '../../models/reporting.model';
import { ReportViewBase, share, sumEntityTotals } from '../shared/report-base';
import { ReportRangeComponent } from '../shared/report-range.component';
import {
  EntityBreakdownComponent,
  EntityRow,
} from '../shared/entity-breakdown/entity-breakdown.component';
import { ReportSkeletonComponent } from '../shared/report-skeleton/report-skeleton.component';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { StatCardComponent } from '../../../../shared/ui/stat-card/stat-card.component';
import {
  AlertComponent,
  EmptyStateComponent,
} from '../../../../shared/ui/states/states.component';

@Component({
  selector: 'app-customer-statistics',
  standalone: true,
  imports: [
    ReportRangeComponent,
    PageHeaderComponent,
    StatCardComponent,
    AlertComponent,
    EmptyStateComponent,
    EntityBreakdownComponent,
    ReportSkeletonComponent,
  ],
  templateUrl: './customer-statistics.component.html',
})
export class CustomerStatisticsComponent
  extends ReportViewBase<CustomerStatisticsData>
  implements OnInit
{
  private readonly reportingService = inject(ReportingService);

  readonly totals = computed(() => sumEntityTotals(this.rows()));

  /**
   * Share of tickets that reached Resolved or Closed. Both fields come
   * straight from the endpoint — nothing here is a derived "score".
   */
  readonly completionRate = computed(() => {
    const t = this.totals();
    return share(t.resolved + t.closed, t.total);
  });

  /** Rows normalised for the shared breakdown component. */
  readonly entityRows = computed<EntityRow[]>(() =>
    this.rows().map((r) => ({
      id: r.customerId,
      name: r.customerName,
      total: r.totalTickets,
      active: r.activeTickets,
      resolved: r.resolvedTickets,
      closed: r.closedTickets,
    })),
  );

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.beginLoad();
    this.reportingService
      .getCustomerStatistics(this.range())
      .subscribe(
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
