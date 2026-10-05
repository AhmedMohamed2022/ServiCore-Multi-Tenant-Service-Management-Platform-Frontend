import { Component, computed, inject, OnInit } from '@angular/core';

import { ReportingService } from '../../../../core/services/reporting.service';
import { AgentStatisticsData } from '../../models/reporting.model';
import { ReportViewBase, share, sumEntityTotals } from '../shared/report-base';
import { ReportRangeComponent } from '../shared/report-range.component';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { StatCardComponent } from '../../../../shared/ui/stat-card/stat-card.component';
import {
  AlertComponent,
  EmptyStateComponent,
} from '../../../../shared/ui/states/states.component';
import { ReportSkeletonComponent } from '../shared/report-skeleton/report-skeleton.component';
import {
  EntityBreakdownComponent,
  EntityRow,
} from '../shared/entity-breakdown/entity-breakdown.component';

@Component({
  selector: 'app-agent-statistics',
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
  templateUrl: './agent-statistics.component.html',
})
export class AgentStatisticsComponent
  extends ReportViewBase<AgentStatisticsData>
  implements OnInit
{
  private readonly reportingService = inject(ReportingService);

  readonly totals = computed(() =>
    sumEntityTotals(
      this.rows().map((a) => ({
        totalTickets: a.assignedTickets,
        activeTickets: a.activeTickets,
        resolvedTickets: a.resolvedTickets,
        closedTickets: a.closedTickets,
      })),
    ),
  );

  /**
   * Resolution rate across the whole team. Derived only from fields the
   * endpoint returns — resolved and closed over assigned — rather than being
   * an invented performance score.
   */
  readonly resolutionRate = computed(() => {
    const t = this.totals();
    return share(t.resolved + t.closed, t.total);
  });

  /** Rows normalised for the shared breakdown component. */
  readonly entityRows = computed<EntityRow[]>(() =>
    this.rows().map((a) => ({
      id: a.agentId,
      name: a.agentUserName || `Agent ${a.agentId.substring(0, 8)}`,
      total: a.assignedTickets,
      active: a.activeTickets,
      resolved: a.resolvedTickets,
      closed: a.closedTickets,
    })),
  );

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.beginLoad();
    this.reportingService
      .getAgentStatistics(this.range())
      .subscribe(
        this.handle((result) =>
          this.rows.set(
            [...result].sort((a, b) => b.resolvedTickets - a.resolvedTickets),
          ),
        ),
      );
  }

  shareOf(value: number, total: number): number {
    return share(value, total);
  }
}
