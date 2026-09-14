import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ReportingService } from '../../../../core/services/reporting.service';
import { TicketTimeSeriesPointData } from '../../models/reporting.model';

interface ChartSeriesPoint {
  x: number;
  y: number;
}

// Fixed chart canvas dimensions (SVG viewBox units).
const CHART_WIDTH = 760;
const CHART_HEIGHT = 260;
const CHART_PADDING_LEFT = 40;
const CHART_PADDING_BOTTOM = 30;
const CHART_PADDING_TOP = 20;
const CHART_PADDING_RIGHT = 20;

@Component({
  selector: 'app-ticket-time-series',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ticket-time-series.component.html',
  styleUrls: ['./ticket-time-series.component.css'],
})
export class TicketTimeSeriesComponent implements OnInit {
  private readonly reportingService = inject(ReportingService);
  private readonly fb = inject(FormBuilder);

  readonly points = signal<TicketTimeSeriesPointData[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly chartWidth = CHART_WIDTH;
  readonly chartHeight = CHART_HEIGHT;

  readonly filterForm = this.fb.group({
    from: [''],
    to: [''],
  });

  // Plot three series: new tickets raised, tickets resolved, tickets closed —
  // this is the "ticket volume over time" chart the reporting domain never
  // got a frontend view for.
  private readonly maxValue = computed(() => {
    const data = this.points();
    if (data.length === 0) return 1;
    return Math.max(
      1,
      ...data.map((p) => p.newTickets),
      ...data.map((p) => p.resolvedTickets),
      ...data.map((p) => p.closedTickets),
    );
  });

  readonly newTicketsLine = computed(() =>
    this.buildLine(this.points().map((p) => p.newTickets)),
  );
  readonly resolvedTicketsLine = computed(() =>
    this.buildLine(this.points().map((p) => p.resolvedTickets)),
  );
  readonly closedTicketsLine = computed(() =>
    this.buildLine(this.points().map((p) => p.closedTickets)),
  );

  readonly yAxisTicks = computed(() => {
    const max = this.maxValue();
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const value = Math.round((max / steps) * (steps - i));
      const y =
        CHART_PADDING_TOP +
        ((CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM) / steps) * i;
      return { value, y };
    });
  });

  // A handful of x-axis date labels, spread evenly, so the chart doesn't
  // get crowded with one label per data point on wide date ranges.
  readonly xAxisLabels = computed(() => {
    const data = this.points();
    if (data.length === 0) return [];
    const maxLabels = 6;
    const step = Math.max(1, Math.ceil(data.length / maxLabels));
    const plotWidth = CHART_WIDTH - CHART_PADDING_LEFT - CHART_PADDING_RIGHT;

    return data
      .map((p, i) => ({ point: p, index: i }))
      .filter(({ index }) => index % step === 0 || index === data.length - 1)
      .map(({ point, index }) => ({
        label: new Date(point.date).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
        x:
          CHART_PADDING_LEFT +
          (data.length === 1
            ? plotWidth / 2
            : (plotWidth / (data.length - 1)) * index),
      }));
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

    this.reportingService.getTicketTimeSeries(filters).subscribe({
      next: (result) => {
        // Backend order isn't guaranteed to be chronological — sort defensively.
        this.points.set(
          [...result].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          ),
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

  private buildLine(values: number[]): string {
    if (values.length === 0) return '';

    const plotWidth = CHART_WIDTH - CHART_PADDING_LEFT - CHART_PADDING_RIGHT;
    const plotHeight = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;
    const max = this.maxValue();

    const coords: ChartSeriesPoint[] = values.map((value, index) => {
      const x =
        CHART_PADDING_LEFT +
        (values.length === 1
          ? plotWidth / 2
          : (plotWidth / (values.length - 1)) * index);
      const y = CHART_PADDING_TOP + plotHeight - (value / max) * plotHeight;
      return { x, y };
    });

    return coords.map((c) => `${c.x},${c.y}`).join(' ');
  }
}
