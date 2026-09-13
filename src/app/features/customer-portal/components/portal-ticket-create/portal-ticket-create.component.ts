import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CustomerTicketService } from '../../../../core/services/customer-ticket.service';
import { CategoryService } from '../../../../core/services/category.service';
import { CategoryDto } from '../../../management/models/category.model';
import {
  TicketPriority,
  TicketPriorityLabels,
} from '../../../tickets/models/ticket-enums.model';

@Component({
  selector: 'app-portal-ticket-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './portal-ticket-create.component.html',
  styleUrls: ['./portal-ticket-create.component.css'],
})
export class PortalTicketCreateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly portalService = inject(CustomerTicketService);
  private readonly categoryService = inject(CategoryService);

  readonly categories = signal<CategoryDto[]>([]);
  readonly isLoadingOptions = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  protected readonly priorityOptions = Object.keys(TicketPriorityLabels).map(
    (key) => ({
      value: Number(key),
      label: TicketPriorityLabels[Number(key)],
    }),
  );

  readonly ticketForm = this.fb.nonNullable.group({
    title: [
      '',
      [Validators.required, Validators.minLength(5), Validators.maxLength(100)],
    ],
    description: ['', [Validators.required, Validators.minLength(10)]],
    categoryId: ['', [Validators.required]],
    priority: [TicketPriority.Medium, [Validators.required]],
  });

  ngOnInit(): void {
    this.loadAvailableCategories();
  }

  loadAvailableCategories(): void {
    this.isLoadingOptions.set(true);
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        this.categories.set(data);
        this.isLoadingOptions.set(false);
      },
      error: (err: Error) => {
        this.errorMessage.set(
          `Failed to retrieve taxonomy categories: ${err.message}`,
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

    const formValues = this.ticketForm.getRawValue();

    this.portalService
      .createPortalTicket(
        formValues.title,
        formValues.description,
        formValues.categoryId,
        Number(formValues.priority),
      )
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/portal/tickets']);
        },
        error: (err: Error) => {
          this.errorMessage.set(err.message);
          this.isSubmitting.set(false);
        },
      });
  }
}
