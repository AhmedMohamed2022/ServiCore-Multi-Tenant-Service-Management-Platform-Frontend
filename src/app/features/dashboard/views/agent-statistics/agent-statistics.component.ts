import { Component, computed, inject, OnInit } from '@angular/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';

import { ReportingService } from '../../../../core/services/reporting.service';
import { AgentStatisticsData } from '../../models/reporting.model';
import {
  ReportViewBase,
  share,
  sumEntityTotals,
} from '../shared/report-base';
import { ReportRangeComponent } from '../shared/report-range.component';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { StatCardComponent } from '../../../../shared/ui/stat-card/stat-card.component';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
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
  selector: 'app-agent-statistics',
  standalone: true,
  imports: [
    NgxChartsModule,
    ReportRangeComponent,
    PageHeaderComponent,
    StatCardComponent,
    AvatarComponent,
    AlertComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    ChartCardComponent,
  ],
  templateUrl: './agent-statistics.component.html',
})
export class AgentStatisticsComponent
  extends ReportViewBase<AgentStatisticsData>
  implements OnInit
{
  private readonly reportingService = inject(ReportingService);

  readonly chartColors = CATEGORICAL_COLOR_SCHEME;

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

  readonly busiestAgent = computed(() => {
    const ranked = [...this.rows()].sort(
      (a, b) => b.activeTickets - a.activeTickets,
    );
    return ranked[0] ?? null;
  });

  /** Top ten by resolved volume; more than that is unreadable as bars. */
  readonly chartData = computed(() =>
    [...this.rows()]
      .sort((a, b) => b.resolvedTickets - a.resolvedTickets)
      .slice(0, 10)
      .map((agent) => ({
        name: agent.agentUserName || agent.agentId.substring(0, 8),
        value: agent.resolvedTickets,
      })),
  );

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.beginLoad();
    this.reportingService.getAgentStatistics(this.range()).subscribe(
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
