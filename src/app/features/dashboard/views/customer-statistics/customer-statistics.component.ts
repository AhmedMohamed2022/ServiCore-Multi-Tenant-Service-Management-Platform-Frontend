import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ReportingService } from '../../../../core/services/reporting.service';
import { CustomerStatisticsData } from '../../models/reporting.model';

@Component({
  selector: 'app-customer-statistics',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './customer-statistics.component.html',
  styleUrls: ['./customer-statistics.component.css'],
})
export class CustomerStatisticsComponent implements OnInit {
  private readonly reportingService = inject(ReportingService);
  private readonly fb = inject(FormBuilder);

  readonly customers = signal<CustomerStatisticsData[]>([]);
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

    this.reportingService.getCustomerStatistics(filters).subscribe({
      next: (result) => {
        this.customers.set(
          [...result].sort((a, b) => b.totalTickets - a.totalTickets),
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
