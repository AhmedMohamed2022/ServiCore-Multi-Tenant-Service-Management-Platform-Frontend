import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CustomerTicketService } from '../../../../core/services/customer-ticket.service';
import { CategoryService } from '../../../../core/services/category.service';
import { CategoryDto } from '../../../management/models/category.model';
import {
  TicketPriority,
  TicketPriorityLabels,
} from '../../../tickets/models/ticket-enums.model';

import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { PRIORITY_CHOICES } from '../../utils/portal-view';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { AlertComponent } from '../../../../shared/ui/states/states.component';

@Component({
  selector: 'app-portal-ticket-create',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    PageHeaderComponent,
    IconComponent,
    AlertComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portal-ticket-create.component.html',
  styleUrls: ['./portal-ticket-create.component.css'],
})
export class PortalTicketCreateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly ticketService = inject(CustomerTicketService);
  private readonly categoryService = inject(CategoryService);
  private readonly toast = inject(ToastService);

  readonly categories = signal<CategoryDto[]>([]);
  readonly isLoadingOptions = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  protected readonly priorityOptions = Object.keys(TicketPriorityLabels)
    .map(Number)
    .filter((key) => !Number.isNaN(key))
    .map((value) => ({
      value,
      label: TicketPriorityLabels[value],
    }));

  /** Plain-language guidance shown on each priority choice. */
  protected readonly priorityChoices = PRIORITY_CHOICES;

  readonly ticketForm = this.fb.nonNullable.group({
    title: [
      '',
      [Validators.required, Validators.minLength(5), Validators.maxLength(100)],
    ],
    description: ['', [Validators.required, Validators.minLength(10)]],
    categoryId: ['', [Validators.required]],
    priority: [TicketPriority.Medium, [Validators.required]],
  });

  // Live lengths for the counters. Read-only views of the form: they do not
  // touch validation.
  protected readonly titleLength = toSignal(
    this.ticketForm.controls.title.valueChanges,
    { initialValue: '' },
  );
  protected readonly descriptionLength = toSignal(
    this.ticketForm.controls.description.valueChanges,
    { initialValue: '' },
  );

  ngOnInit(): void {
    this.loadDropdownDataOptions();
  }

  loadDropdownDataOptions(): void {
    this.isLoadingOptions.set(true);
    this.errorMessage.set(null);

    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.isLoadingOptions.set(false);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
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

    this.ticketService
      .createPortalTicket(
        formValues.title,
        formValues.description,
        formValues.categoryId,
        Number(formValues.priority),
      )
      .subscribe({
        next: () => {
          this.toast.success(
            "Request sent. We'll notify you when there's an update.",
          );
          this.router.navigate(['/portal/tickets']);
        },
        error: (err: Error) => {
          this.errorMessage.set(err.message);
          this.isSubmitting.set(false);
        },
      });
  }
}
