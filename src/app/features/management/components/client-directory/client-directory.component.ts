import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomerService } from '../../../../core/services/customer.service';
import { CustomerDto } from '../../models/customer.model';

@Component({
  selector: 'app-client-directory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './client-directory.component.html',
  styleUrls: ['./client-directory.component.css'],
})
export class ClientDirectoryComponent implements OnInit {
  private readonly customerService = inject(CustomerService);
  private readonly fb = inject(FormBuilder);

  // Structural Signals tracking state data trees
  readonly customers = signal<CustomerDto[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isEditing = signal<boolean>(false);
  readonly editingCustomerId = signal<string | null>(null);

  // Operational Form Controls
  readonly customerForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
  });

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.isLoading.set(true);
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
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }

    const payload = this.customerForm.getRawValue();
    const id = this.editingCustomerId();

    if (this.isEditing() && id) {
      this.customerService.updateCustomer(id, payload).subscribe({
        next: () => this.resetFormLifecycle(),
        error: (err: Error) => this.errorMessage.set(err.message),
      });
    } else {
      this.customerService.createCustomer(payload).subscribe({
        next: () => this.resetFormLifecycle(),
        error: (err: Error) => this.errorMessage.set(err.message),
      });
    }
  }

  onEditInit(customer: CustomerDto): void {
    this.isEditing.set(true);
    this.editingCustomerId.set(customer.id);
    this.customerForm.patchValue({
      name: customer.name,
      email: customer.email,
    });
  }

  onDelete(id: string): void {
    if (
      confirm(
        'Are you sure you want to completely remove this CRM client record entry?',
      )
    ) {
      this.customerService.deleteCustomer(id).subscribe({
        next: () => this.loadCustomers(),
        error: (err: Error) => this.errorMessage.set(err.message),
      });
    }
  }

  resetFormLifecycle(): void {
    this.customerForm.reset();
    this.isEditing.set(false);
    this.editingCustomerId.set(null);
    this.loadCustomers();
  }
}
