import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import { CustomerService } from '../../../../core/services/customer.service';
import { CustomerDto } from '../../models/customer.model';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
import {
  AlertComponent,
  EmptyStateComponent,
  LoadingStateComponent,
} from '../../../../shared/ui/states/states.component';
import { ConfirmService } from '../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

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
    LoadingStateComponent,
  ],
  templateUrl: './client-directory.component.html',
  styleUrls: ['./client-directory.component.css'],
})
export class ClientDirectoryComponent implements OnInit {
  private readonly customerService = inject(CustomerService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly customers = signal<CustomerDto[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly editingCustomerId = signal<string | null>(null);

  readonly searchTerm = signal<string>('');
  readonly showInactive = signal<boolean>(false);

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

  readonly visibleCustomers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const includeInactive = this.showInactive();

    return this.customers()
      .filter((customer) => includeInactive || customer.isActive)
      .filter(
        (customer) =>
          !term ||
          customer.name.toLowerCase().includes(term) ||
          customer.email.toLowerCase().includes(term) ||
          (customer.phoneNumber ?? '').toLowerCase().includes(term),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly hasFilters = computed(
    () => this.searchTerm().trim().length > 0 || this.showInactive(),
  );

  ngOnInit(): void {
    this.loadCustomers();
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
    this.showInactive.set(false);
  }
}
