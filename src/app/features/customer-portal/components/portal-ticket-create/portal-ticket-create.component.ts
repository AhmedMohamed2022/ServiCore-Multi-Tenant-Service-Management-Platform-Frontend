import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { TicketService } from '../../../../core/services/ticket.service';
import { CategoryService } from '../../../../core/services/category.service';
import { TeamService } from '../../../../core/services/team.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { CategoryDto } from '../../../management/models/category.model';
import { TeamDto } from '../../../management/models/team.model';
import {
  TicketPriority,
  TicketPriorityLabels,
} from '../../../tickets/models/ticket-enums.model';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import {
  AlertComponent,
  LoadingStateComponent,
} from '../../../../shared/ui/states/states.component';

@Component({
  selector: 'app-portal-ticket-create',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    PageHeaderComponent,
    IconComponent,
    AlertComponent,
    LoadingStateComponent,
  ],
  templateUrl: './portal-ticket-create.component.html',
})
export class PortalTicketCreateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly ticketService = inject(TicketService);
  private readonly categoryService = inject(CategoryService);
  private readonly teamService = inject(TeamService);
  private readonly tenantContext = inject(TenantContextService);

  readonly categories = signal<CategoryDto[]>([]);
  readonly teams = signal<TeamDto[]>([]);
  readonly isLoadingOptions = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  protected readonly priorityOptions = Object.keys(TicketPriorityLabels)
    .map(Number)
    .filter((key) => !Number.isNaN(key))
    .map((value) => ({ value, label: TicketPriorityLabels[value] }));

  readonly ticketForm = this.fb.nonNullable.group({
    title: [
      '',
      [Validators.required, Validators.minLength(5), Validators.maxLength(100)],
    ],
    description: ['', [Validators.required, Validators.minLength(10)]],
    categoryId: ['', [Validators.required]],
    teamId: ['', [Validators.required]],
    priority: [TicketPriority.Medium, [Validators.required]],
  });

  ngOnInit(): void {
    this.loadDropdownDataOptions();
  }

  loadDropdownDataOptions(): void {
    this.isLoadingOptions.set(true);
    this.errorMessage.set(null);

    // Categories and teams are org-wide lookups, not staff-only endpoints —
    // GET /categories and GET /teams both work for an authenticated
    // customer once the X-Organization-Id header is set, same as for staff.
    forkJoin({
      cats: this.categoryService.getCategories(),
      teams: this.teamService.getTeams(),
    }).subscribe({
      next: (res) => {
        this.categories.set(res.cats);
        this.teams.set(res.teams);
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

    const customerId = this.tenantContext.currentCustomerId();
    if (!customerId) {
      // Shouldn't happen behind portalTenantGuard, but fail loudly rather
      // than silently sending an empty id to the backend if it ever does.
      this.errorMessage.set(
        'Your account context is missing. Please sign out and back in.',
      );
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formValues = this.ticketForm.getRawValue();

    const payload = {
      customerId,
      teamId: formValues.teamId,
      categoryId: formValues.categoryId,
      title: formValues.title.trim(),
      description: formValues.description.trim(),
      priority: Number(formValues.priority),
    };

    this.ticketService.createTicket(payload).subscribe({
      next: () => this.router.navigate(['/portal/tickets']),
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isSubmitting.set(false);
      },
    });
  }
}
