import { Component, computed, inject, OnInit, signal } from '@angular/core';
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
  TicketPriorityLabels,
} from '../../models/ticket-enums.model';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import {
  AlertComponent,
  EmptyStateComponent,
  LoadingStateComponent,
} from '../../../../shared/ui/states/states.component';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-ticket-create',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    IconComponent,
    AlertComponent,
    EmptyStateComponent,
    LoadingStateComponent,
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
  private readonly toast = inject(ToastService);

  readonly categories = signal<CategoryDto[]>([]);
  readonly customers = signal<CustomerDto[]>([]);
  readonly teams = signal<TeamDto[]>([]);
  readonly isLoadingOptions = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly loadErrorMessage = signal<string | null>(null);

  protected readonly priorityOptions = Object.keys(TicketPriorityLabels).map(
    (key) => ({
      value: Number(key),
      label: TicketPriorityLabels[Number(key)],
    }),
  );

  /**
   * A staff member can't raise a ticket at all if the organization has no
   * customer, team or category yet — the form has nothing valid to submit.
   * Surfaced explicitly rather than as three empty, disabled dropdowns.
   */
  private readonly missingPrerequisite = signal<
    'customers' | 'teams' | 'categories' | null
  >(null);

  private static readonly PREREQUISITE_COPY = {
    customers: {
      icon: 'group',
      title: 'Add a customer first',
      description: 'A ticket needs a customer to raise it for.',
      actionLabel: 'Go to customers',
      link: '/app/management/customers',
    },
    teams: {
      icon: 'diversity_3',
      title: 'Add a team first',
      description: 'A ticket needs a team to route it to.',
      actionLabel: 'Go to teams',
      link: '/app/management/teams',
    },
    categories: {
      icon: 'sell',
      title: 'Add a category first',
      description: 'A ticket needs a category to classify it.',
      actionLabel: 'Go to categories',
      link: '/app/management/categories',
    },
  } as const;

  readonly prerequisiteNotice = computed(() => {
    const missing = this.missingPrerequisite();
    return missing ? TicketCreateComponent.PREREQUISITE_COPY[missing] : null;
  });

  goToPrerequisite(): void {
    const notice = this.prerequisiteNotice();
    if (notice) this.router.navigate([notice.link]);
  }

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

  ngOnInit(): void {
    this.loadDropdownDataOptions();
  }

  loadDropdownDataOptions(): void {
    this.isLoadingOptions.set(true);
    this.loadErrorMessage.set(null);

    forkJoin({
      cats: this.categoryService.getCategories(),
      custs: this.customerService.getCustomers(),
      teams: this.teamService.getTeams(),
    }).subscribe({
      next: (res) => {
        // Inactive customers and categories can still be assigned to a new
        // ticket via a stale link, but shouldn't be offered here.
        this.categories.set(res.cats.filter((c) => c.isActive));
        this.customers.set(res.custs.filter((c) => c.isActive));
        this.teams.set(res.teams);
        this.isLoadingOptions.set(false);

        if (this.customers().length === 0) this.missingPrerequisite.set('customers');
        else if (this.teams().length === 0) this.missingPrerequisite.set('teams');
        else if (this.categories().length === 0) this.missingPrerequisite.set('categories');
        else this.missingPrerequisite.set(null);
      },
      error: (err: Error) => {
        this.loadErrorMessage.set(err.message);
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
      next: (created) => {
        this.isSubmitting.set(false);
        this.toast.success('Ticket created.');
        this.router.navigate(['/app/tickets', created.id]);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.toast.error(err.message);
        this.isSubmitting.set(false);
      },
    });
  }
}
