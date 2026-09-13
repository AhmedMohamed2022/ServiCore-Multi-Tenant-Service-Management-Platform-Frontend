import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ReportingService } from '../../core/services/reporting.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { DashboardOverviewResponse } from './models/reporting.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  private readonly reportingService = inject(ReportingService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly metrics = signal<DashboardOverviewResponse | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly userEmail = () =>
    this.authService.currentUser()?.email || 'Operator';

  readonly filterForm = this.fb.group({
    from: [''],
    to: [''],
  });

  ngOnInit(): void {
    this.fetchAnalyticsData();
  }

  fetchAnalyticsData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const formValues = this.filterForm.value;
    const requestFilters = {
      from: formValues.from
        ? new Date(formValues.from).toISOString()
        : undefined,
      to: formValues.to ? new Date(formValues.to).toISOString() : undefined,
    };

    this.reportingService.getDashboardOverview(requestFilters).subscribe({
      next: (data) => {
        this.metrics.set(data);
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isLoading.set(false);
      },
    });
  }

  onApplyFilters(): void {
    this.fetchAnalyticsData();
  }

  onResetFilters(): void {
    this.filterForm.reset();
    this.fetchAnalyticsData();
  }
}
