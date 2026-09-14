import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ReportingService } from '../../../../core/services/reporting.service';
import { AgentStatisticsData } from '../../models/reporting.model';

@Component({
  selector: 'app-agent-statistics',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './agent-statistics.component.html',
  styleUrls: ['./agent-statistics.component.css'],
})
export class AgentStatisticsComponent implements OnInit {
  private readonly reportingService = inject(ReportingService);
  private readonly fb = inject(FormBuilder);

  readonly agents = signal<AgentStatisticsData[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly filterForm = this.fb.group({
    from: [''],
    to: [''],
  });

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const formValues = this.filterForm.value;
    const filters = {
      from: formValues.from
        ? new Date(formValues.from).toISOString()
        : undefined,
      to: formValues.to ? new Date(formValues.to).toISOString() : undefined,
    };

    this.reportingService.getAgentStatistics(filters).subscribe({
      next: (result) => {
        // Leaderboard: rank agents by resolved tickets, most first.
        this.agents.set(
          [...result].sort((a, b) => b.resolvedTickets - a.resolvedTickets),
        );
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isLoading.set(false);
      },
    });
  }

  onApplyFilters(): void {
    this.fetchData();
  }

  onResetFilters(): void {
    this.filterForm.reset();
    this.fetchData();
  }
}
