import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TicketService } from '../../../../core/services/ticket.service';
import { CategoryService } from '../../../../core/services/category.service';
import { CustomerService } from '../../../../core/services/customer.service';
import { TeamService } from '../../../../core/services/team.service';
import { CategoryDto } from '../../../management/models/category.model';
import { CustomerDto } from '../../../management/models/customer.model';
import { TeamDto } from '../../../management/models/team.model';
import {
  TicketPriority,
  TicketPriorityIcons,
  TicketPriorityLabels,
} from '../../models/ticket-enums.model';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { AlertComponent } from '../../../../shared/ui/states/states.component';
import { TicketPriorityBadgeComponent } from '../../../../shared/ticket/ticket-badges.component';

@Component({
  selector: 'app-ticket-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    IconComponent,
    AlertComponent,
    TicketPriorityBadgeComponent,
  ],
  templateUrl: './ticket-create.component.html',
  styleUrls: ['./ticket-create.component.css'],
})
export class TicketCreateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly ticketService = inject(TicketService);
  private readonly categoryService = inject(CategoryService);
  private readonly customerService = inject(CustomerService);
  private readonly teamService = inject(TeamService);

  readonly categories = signal<CategoryDto[]>([]);
  readonly customers = signal<CustomerDto[]>([]);
  readonly teams = signal<TeamDto[]>([]);
  readonly isLoadingOptions = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  /** True when the team/customer/category lists failed to load. */
  readonly optionsFailed = signal<boolean>(false);

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
    customerId: ['', [Validators.required]],
    teamId: ['', [Validators.required]],
    priority: [TicketPriority.Medium, [Validators.required]],
  });

  /**
   * Short guidance under each priority. Copy only: it describes how to choose,
   * not what the system will do with the choice.
   */
  protected readonly priorityChoices = this.priorityOptions.map((option) => ({
    ...option,
    icon: TicketPriorityIcons[option.value],
    hint:
      {
        1: 'Nothing is blocked. Can wait.',
        2: 'Normal request. The default.',
        3: 'Blocking real work. Needs attention soon.',
        4: 'Outage or a customer completely stuck.',
      }[option.value] ?? '',
  }));

  /** Live copy of the form, so the summary panel can follow every keystroke. */
  private readonly formValue = toSignal(this.ticketForm.valueChanges, {
    initialValue: this.ticketForm.getRawValue(),
  });

  protected readonly titleLength = computed(
    () => (this.formValue().title ?? '').length,
  );
  protected readonly descriptionLength = computed(
    () => (this.formValue().description ?? '').trim().length,
  );

  protected readonly selectedTeam = computed(
    () => this.teams().find((t) => t.id === this.formValue().teamId) ?? null,
  );
  protected readonly selectedCustomer = computed(
    () =>
      this.customers().find((c) => c.id === this.formValue().customerId) ??
      null,
  );
  protected readonly selectedCategory = computed(
    () =>
      this.categories().find((c) => c.id === this.formValue().categoryId) ??
      null,
  );
  protected readonly selectedPriority = computed(() =>
    Number(this.formValue().priority ?? TicketPriority.Medium),
  );

  protected readonly priorityHint = computed(
    () =>
      this.priorityChoices.find((c) => c.value === this.selectedPriority())
        ?.hint ?? '',
  );

  /** Required fields still to complete, for the hint next to the button. */
  protected readonly remainingFields = computed(() => {
    this.formValue();
    return Object.values(this.ticketForm.controls).filter((c) => c.invalid)
      .length;
  });

  ngOnInit(): void {
    this.loadDropdownDataOptions();
  }

  /** Ctrl/Cmd + Enter submits from anywhere in the form. */
  onFormKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (!this.isSubmitting()) this.onSubmit();
    }
  }

  loadDropdownDataOptions(): void {
    this.isLoadingOptions.set(true);
    this.errorMessage.set(null);
    this.optionsFailed.set(false);

    forkJoin({
      cats: this.categoryService.getCategories(),
      custs: this.customerService.getCustomers(),
      teams: this.teamService.getTeams(),
    }).subscribe({
      next: (res) => {
        this.categories.set(res.cats);
        this.customers.set(res.custs);
        this.teams.set(res.teams);
        this.isLoadingOptions.set(false);
      },
      error: (err: Error) => {
        this.errorMessage.set(
          `Failed to load dependency options: ${err.message}`,
        );
        this.optionsFailed.set(true);
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

    const payload = {
      customerId: formValues.customerId,
      teamId: formValues.teamId,
      categoryId: formValues.categoryId,
      title: formValues.title.trim(),
      description: formValues.description.trim(),
      priority: Number(formValues.priority),
    };

    this.ticketService.createTicket(payload).subscribe({
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
