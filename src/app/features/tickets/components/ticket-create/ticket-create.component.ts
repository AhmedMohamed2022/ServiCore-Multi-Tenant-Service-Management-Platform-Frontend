import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TicketService } from '../../../../core/services/ticket.service';
import { CategoryService } from '../../../../core/services/category.service';
import { CustomerService } from '../../../../core/services/customer.service';
import { CategoryDto } from '../../../management/models/category.model';
import { CustomerDto } from '../../../management/models/customer.model';
import {
  TicketPriority,
  TicketPriorityLabels,
} from '../../models/ticket-enums.model';

@Component({
  selector: 'app-ticket-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './ticket-create.component.html',
  styleUrls: ['./ticket-create.component.css'],
})
export class TicketCreateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly ticketService = inject(TicketService);
  private readonly categoryService = inject(CategoryService);
  private readonly customerService = inject(CustomerService);

  // Structural State Signals
  readonly categories = signal<CategoryDto[]>([]);
  readonly customers = signal<CustomerDto[]>([]);
  readonly isLoadingOptions = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Expose the raw priority options list array to the template
  protected readonly priorityOptions = Object.keys(TicketPriorityLabels)
    .filter((key) => !isNaN(Number(key)))
    .map((key) => ({
      value: Number(key),
      label: TicketPriorityLabels[Number(key) as TicketPriority],
    }));

  // Form group definition mapping strictly to CreateTicketRequest properties
  readonly ticketForm = this.fb.nonNullable.group({
    title: [
      '',
      [Validators.required, Validators.minLength(5), Validators.maxLength(100)],
    ],
    description: ['', [Validators.required, Validators.minLength(10)]],
    categoryId: ['', [Validators.required]],
    customerId: ['', [Validators.required]],
    priority: [TicketPriority.Medium, [Validators.required]],
  });

  ngOnInit(): void {
    this.loadDropdownDataOptions();
  }

  loadDropdownDataOptions(): void {
    this.isLoadingOptions.set(true);
    this.errorMessage.set(null);

    // Parallel fetch lookups to populate form selector nodes safely
    forkJoin({
      cats: this.categoryService.getCategories(),
      custs: this.customerService.getCustomers(),
    }).subscribe({
      next: (res) => {
        this.categories.set(res.cats);
        this.customers.set(res.custs);
        this.isLoadingOptions.set(false);
      },
      error: (err: Error) => {
        this.errorMessage.set(
          `Failed to load dependency options: ${err.message}`,
        );
        this.isLoadingOptions.set(false);
      },
    });
  }

  onSubmit(): void {
    if (this.ticketForm.invalid) {
      this.ticketForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    // Extract exact raw mapping value records payload
    const requestPayload = this.ticketForm.getRawValue();

    this.ticketService.createTicket(requestPayload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/app/tickets']);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isSubmitting.set(false);
      },
    });
  }
}
