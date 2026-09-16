import { computed, signal } from '@angular/core';
import { ReportDateRangeRequest } from '../../models/reporting.model';

/**
 * The state every report view shares: the active date range, a loading flag,
 * an error message, and the rows themselves.
 *
 * Each of the six views used to carry its own near-identical copy of this
 * plus a hand-rolled filter form. Extending it keeps the views down to the
 * part that actually differs — the shaping of the data and the chart.
 */
export abstract class ReportViewBase<TRow> {
  readonly rows = signal<TRow[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly range = signal<ReportDateRangeRequest>({});

  readonly hasRows = computed(() => this.rows().length > 0);

  onRangeChange(range: ReportDateRangeRequest): void {
    this.range.set(range);
    this.fetchData();
  }

  abstract fetchData(): void;

  /** Shared plumbing for the subscribe blocks, so error handling is uniform. */
  protected handle(
    onNext: (rows: TRow[]) => void,
  ): { next: (rows: TRow[]) => void; error: (err: Error) => void } {
    return {
      next: (rows) => {
        onNext(rows);
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isLoading.set(false);
      },
    };
  }

  protected beginLoad(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
  }
}

/**
 * Totals strip shown above each breakdown table. Values are summed from the
 * rows the endpoint returned rather than fetched separately, so the header
 * and the table can never disagree.
 */
export interface EntityTotals {
  readonly total: number;
  readonly active: number;
  readonly resolved: number;
  readonly closed: number;
}

export function sumEntityTotals(
  rows: readonly {
    totalTickets: number;
    activeTickets: number;
    resolvedTickets: number;
    closedTickets: number;
  }[],
): EntityTotals {
  return rows.reduce<EntityTotals>(
    (acc, row) => ({
      total: acc.total + row.totalTickets,
      active: acc.active + row.activeTickets,
      resolved: acc.resolved + row.resolvedTickets,
      closed: acc.closed + row.closedTickets,
    }),
    { total: 0, active: 0, resolved: 0, closed: 0 },
  );
}

/**
 * Percentage of a whole, guarding the zero case so an empty report renders
 * 0% rather than NaN.
 */
export function share(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}
