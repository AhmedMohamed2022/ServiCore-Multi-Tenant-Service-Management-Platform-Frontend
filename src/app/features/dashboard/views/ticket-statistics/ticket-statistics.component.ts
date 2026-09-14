import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ReportingService } from '../../../../core/services/reporting.service';
import { TicketStatisticsResponse } from '../../models/reporting.model';
import {
  TicketStatusLabels,
  TicketPriorityLabels,
} from '../../../tickets/models/ticket-enums.model';

@Component({
  selector: 'app-ticket-statistics',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ticket-statistics.component.html',
  styleUrls: ['./ticket-statistics.component.css'],
})
export class TicketStatisticsComponent implements OnInit {
  private readonly reportingService = inject(ReportingService);
  private readonly fb = inject(FormBuilder);

  readonly data = signal<TicketStatisticsResponse | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly statusLabels = TicketStatusLabels;
  readonly priorityLabels = TicketPriorityLabels;

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

    this.reportingService.getTicketStatistics(filters).subscribe({
      next: (result) => {
        this.data.set(result);
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
