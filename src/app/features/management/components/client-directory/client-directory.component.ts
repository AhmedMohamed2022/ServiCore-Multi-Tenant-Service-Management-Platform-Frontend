import {
  Component,
  computed,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import { CustomerService } from '../../../../core/services/customer.service';
import { ReportingService } from '../../../../core/services/reporting.service';
import { CustomerStatisticsData } from '../../../dashboard/models/reporting.model';
import { CountUpDirective } from '../../../dashboard/widgets/directives/count-up.directive';
import { CustomerDto } from '../../models/customer.model';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
import {
  AlertComponent,
  EmptyStateComponent,
} from '../../../../shared/ui/states/states.component';
import { ConfirmService } from '../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

type StatusFilter = 'active' | 'inactive' | 'all';
type SortKey = 'name' | 'tickets' | 'added';

@Component({
  selector: 'app-client-directory',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    IconComponent,
    AvatarComponent,
    AlertComponent,
    EmptyStateComponent,
    RouterLink,
    CountUpDirective,
  ],
  templateUrl: './client-directory.component.html',
  styleUrls: ['./client-directory.component.css'],
})
export class ClientDirectoryComponent implements OnInit {
  private readonly customerService = inject(CustomerService);
  private readonly reportingService = inject(ReportingService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly customers = signal<CustomerDto[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly editingCustomerId = signal<string | null>(null);

  readonly searchTerm = signal<string>('');
  readonly statusFilter = signal<StatusFilter>('active');
  /** Kept for compatibility: true whenever deactivated records are included. */
  readonly showInactive = computed(() => this.statusFilter() !== 'active');
  readonly sortKey = signal<SortKey>('name');
  readonly sortDir = signal<'asc' | 'desc'>('asc');

  /** GET /reports/customers, an independent widget: its failure only blanks ticket numbers. */
  readonly stats = signal<CustomerStatisticsData[]>([]);
  readonly statsState = signal<'loading' | 'ready' | 'unavailable'>('loading');
  readonly statsById = computed(
    () => new Map(this.stats().map((stat) => [stat.customerId, stat])),
  );

  private readonly nameInput =
    viewChild<ElementRef<HTMLInputElement>>('customerNameInput');

  readonly isEditing = computed(() => this.editingCustomerId() !== null);

  /**
   * `phoneNumber` is accepted by both CreateCustomerRequest and
   * UpdateCustomerRequest and was simply never offered by this form, so the
   * field could be set through the API but never through the UI.
   */
  readonly customerForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: [''],
  });

  /**
   * Tickets for a customer from the report. A customer the report does not
   * list has no tickets in it, so a loaded report reads as zero; an unloaded
   * or failed one reads as unknown (null), never as zero.
   */
  ticketsFor(customerId: string): CustomerStatisticsData | null {
    if (this.statsState() !== 'ready') return null;
    return (
      this.statsById().get(customerId) ?? {
        customerId,
        customerName: '',
        totalTickets: 0,
        activeTickets: 0,
        resolvedTickets: 0,
        closedTickets: 0,
      }
    );
  }

  readonly visibleCustomers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    const key = this.sortKey();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    const stats = this.statsById();

    return this.customers()
      .filter(
        (customer) =>
          status === 'all' ||
          (status === 'active' ? customer.isActive : !customer.isActive),
      )
      .filter(
        (customer) =>
          !term ||
          customer.name.toLowerCase().includes(term) ||
          customer.email.toLowerCase().includes(term) ||
          (customer.phoneNumber ?? '').toLowerCase().includes(term),
      )
      .sort((a, b) => {
        let delta = 0;
        if (key === 'tickets') {
          delta =
            (stats.get(a.id)?.activeTickets ?? 0) -
            (stats.get(b.id)?.activeTickets ?? 0);
        } else if (key === 'added') {
          delta = Date.parse(a.createdAt) - Date.parse(b.createdAt);
        }
        return delta * dir || a.name.localeCompare(b.name);
      });
  });

  readonly counts = computed(() => {
    const all = this.customers();
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return {
      all: all.length,
      active: all.filter((c) => c.isActive).length,
      inactive: all.filter((c) => !c.isActive).length,
      recent: all.filter(
        (c) => c.isActive && Date.parse(c.createdAt) >= monthAgo,
      ).length,
    };
  });

  /** Active customers with at least one ticket still being worked. */
  readonly withActiveWork = computed(
    () =>
      this.customers().filter(
        (c) =>
          c.isActive && (this.statsById().get(c.id)?.activeTickets ?? 0) > 0,
      ).length,
  );

  readonly hasFilters = computed(
    () =>
      this.searchTerm().trim().length > 0 || this.statusFilter() !== 'active',
  );

  setSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set(key === 'name' ? 'asc' : 'desc');
    }
  }

  ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    if (this.sortKey() !== key) return 'none';
    return this.sortDir() === 'asc' ? 'ascending' : 'descending';
  }

  /** Focuses the form, which sits below the list on narrow screens. */
  focusForm(): void {
    const input = this.nameInput()?.nativeElement;
    if (!input) return;
    input.scrollIntoView({ block: 'center' });
    input.focus({ preventScroll: true });
  }

  ngOnInit(): void {
    this.loadCustomers();
    this.loadStats();
  }

  refresh(): void {
    this.loadCustomers();
    this.loadStats();
  }

  loadStats(): void {
    if (this.statsState() !== 'ready') this.statsState.set('loading');
    this.reportingService.getCustomerStatistics({}).subscribe({
      next: (data) => {
        this.stats.set(data);
        this.statsState.set('ready');
      },
      error: () => {
        if (this.statsState() !== 'ready') this.statsState.set('unavailable');
      },
    });
  }

  loadCustomers(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.customerService.getCustomers().subscribe({
      next: (data) => {
        this.customers.set(data);
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isLoading.set(false);
      },
    });
  }

  onSubmit(): void {
    if (this.customerForm.invalid || this.isSaving()) {
      this.customerForm.markAllAsTouched();
      return;
    }

    const raw = this.customerForm.getRawValue();
    const payload = {
      name: raw.name.trim(),
      email: raw.email.trim(),
      phoneNumber: raw.phoneNumber.trim() || null,
    };

    const id = this.editingCustomerId();
    this.isSaving.set(true);
    this.errorMessage.set(null);

    // Update returns void and create returns the new record; nothing here
    // cares which, so the union is widened rather than branched on.
    const request$: Observable<unknown> = id
      ? this.customerService.updateCustomer(id, payload)
      : this.customerService.createCustomer(payload);

    request$.subscribe({
      next: () => {
        this.toast.success(id ? 'Customer updated.' : 'Customer added.');
        this.isSaving.set(false);
        this.resetFormLifecycle();
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.toast.error(err.message);
        this.isSaving.set(false);
      },
    });
  }

  onEditInit(customer: CustomerDto): void {
    this.editingCustomerId.set(customer.id);
    this.customerForm.setValue({
      name: customer.name,
      email: customer.email,
      phoneNumber: customer.phoneNumber ?? '',
    });
    this.focusForm();
  }

  /**
   * DELETE /customers/{id} maps to CustomerService.DeactivateAsync — the
   * record is retained and its tickets stay intact. The wording says so
   * rather than promising the permanent removal the old "Purge" label
   * implied.
   */
  onDeactivate(customer: CustomerDto): void {
    this.confirm
      .ask({
        title: `Deactivate ${customer.name}?`,
        message:
          'They will no longer appear when raising new tickets. Existing tickets and history are kept, and the record can be reactivated by support.',
        confirmLabel: 'Deactivate',
        tone: 'danger',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.customerService.deleteCustomer(customer.id).subscribe({
          next: () => {
            this.toast.success(`${customer.name} deactivated.`);
            if (this.editingCustomerId() === customer.id) {
              this.resetFormLifecycle();
            } else {
              this.loadCustomers();
            }
          },
          error: (err: Error) => {
            this.errorMessage.set(err.message);
            this.toast.error(err.message);
          },
        });
      });
  }

  resetFormLifecycle(): void {
    this.customerForm.reset({ name: '', email: '', phoneNumber: '' });
    this.editingCustomerId.set(null);
    this.loadCustomers();
  }

  cancelEdit(): void {
    this.customerForm.reset({ name: '', email: '', phoneNumber: '' });
    this.editingCustomerId.set(null);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('active');
  }
}
