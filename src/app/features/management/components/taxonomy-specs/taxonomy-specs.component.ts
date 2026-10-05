import {
  Component,
  computed,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Observable } from 'rxjs';

import { CategoryService } from '../../../../core/services/category.service';
import { ReportingService } from '../../../../core/services/reporting.service';
import { CategoryStatisticsData } from '../../../dashboard/models/reporting.model';
import { CountUpDirective } from '../../../dashboard/widgets/directives/count-up.directive';
import { CategoryDto } from '../../models/category.model';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import {
  AlertComponent,
  EmptyStateComponent,
} from '../../../../shared/ui/states/states.component';
import { ConfirmService } from '../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

type StatusFilter = 'active' | 'inactive' | 'all';
type SortKey = 'name' | 'usage' | 'newest';

@Component({
  selector: 'app-taxonomy-specs',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    IconComponent,
    AlertComponent,
    EmptyStateComponent,
    CountUpDirective,
  ],
  templateUrl: './taxonomy-specs.component.html',
  styleUrls: ['./taxonomy-specs.component.css'],
})
export class TaxonomySpecsComponent implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly reportingService = inject(ReportingService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly categories = signal<CategoryDto[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly editingCategoryId = signal<string | null>(null);

  readonly searchTerm = signal<string>('');
  readonly statusFilter = signal<StatusFilter>('active');
  /** Kept for compatibility: true whenever deactivated categories are included. */
  readonly showInactive = computed(() => this.statusFilter() !== 'active');
  readonly sortKey = signal<SortKey>('name');

  /** GET /reports/categories (all time), an independent widget. */
  readonly stats = signal<CategoryStatisticsData[]>([]);
  readonly statsState = signal<'loading' | 'ready' | 'unavailable'>('loading');
  readonly statsById = computed(
    () => new Map(this.stats().map((stat) => [stat.categoryId, stat])),
  );

  private readonly nameInput =
    viewChild<ElementRef<HTMLInputElement>>('categoryNameInput');

  readonly isEditing = computed(() => this.editingCategoryId() !== null);

  /**
   * `description` is part of both CreateCategoryRequest and
   * UpdateCategoryRequest. The old form only sent a name, so the field was
   * unreachable from the UI.
   */
  readonly categoryForm = this.fb.nonNullable.group({
    name: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(50)],
    ],
    description: ['', [Validators.maxLength(200)]],
  });

  /** Tickets filed under a category; null while unknown, never a guessed zero. */
  usageFor(categoryId: string): CategoryStatisticsData | null {
    if (this.statsState() !== 'ready') return null;
    return (
      this.statsById().get(categoryId) ?? {
        categoryId,
        categoryName: '',
        totalTickets: 0,
        activeTickets: 0,
        resolvedTickets: 0,
        closedTickets: 0,
      }
    );
  }

  readonly visibleCategories = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    const key = this.sortKey();
    const stats = this.statsById();

    return this.categories()
      .filter(
        (category) =>
          status === 'all' ||
          (status === 'active' ? category.isActive : !category.isActive),
      )
      .filter(
        (category) =>
          !term ||
          category.name.toLowerCase().includes(term) ||
          (category.description ?? '').toLowerCase().includes(term),
      )
      .sort((a, b) => {
        if (key === 'usage') {
          const delta =
            (stats.get(b.id)?.totalTickets ?? 0) -
            (stats.get(a.id)?.totalTickets ?? 0);
          if (delta) return delta;
        } else if (key === 'newest') {
          const delta = Date.parse(b.createdAt) - Date.parse(a.createdAt);
          if (delta) return delta;
        }
        return a.name.localeCompare(b.name);
      });
  });

  readonly counts = computed(() => {
    const all = this.categories();
    return {
      all: all.length,
      active: all.filter((c) => c.isActive).length,
      inactive: all.filter((c) => !c.isActive).length,
    };
  });

  /** Active categories nothing has ever been filed under. */
  readonly unusedCount = computed(
    () =>
      this.categories().filter(
        (c) =>
          c.isActive && (this.statsById().get(c.id)?.totalTickets ?? 0) === 0,
      ).length,
  );

  readonly totalFiled = computed(() =>
    this.categories().reduce(
      (sum, c) => sum + (this.statsById().get(c.id)?.totalTickets ?? 0),
      0,
    ),
  );

  /** The category with the most tickets, if any ticket has been filed. */
  readonly topCategory = computed(() => {
    const byId = this.statsById();
    let best: { name: string; count: number } | null = null;
    for (const c of this.categories()) {
      const count = byId.get(c.id)?.totalTickets ?? 0;
      if (count > 0 && (!best || count > best.count)) {
        best = { name: c.name, count };
      }
    }
    return best;
  });

  /** One scale for every usage bar, so rows can be compared at a glance. */
  readonly maxUsage = computed(() =>
    Math.max(1, ...this.stats().map((stat) => stat.totalTickets)),
  );

  usagePercent(categoryId: string): number {
    const total = this.statsById().get(categoryId)?.totalTickets ?? 0;
    return Math.round((total / this.maxUsage()) * 100);
  }

  readonly hasFilters = computed(
    () =>
      this.searchTerm().trim().length > 0 || this.statusFilter() !== 'active',
  );

  focusForm(): void {
    const input = this.nameInput()?.nativeElement;
    if (!input) return;
    input.scrollIntoView({ block: 'center' });
    input.focus({ preventScroll: true });
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadStats();
  }

  refresh(): void {
    this.loadCategories();
    this.loadStats();
  }

  loadStats(): void {
    if (this.statsState() !== 'ready') this.statsState.set('loading');
    this.reportingService.getCategoryStatistics({}).subscribe({
      next: (data) => {
        this.stats.set(data);
        this.statsState.set('ready');
      },
      error: () => {
        if (this.statsState() !== 'ready') this.statsState.set('unavailable');
      },
    });
  }

  loadCategories(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.categoryService.getCategories().subscribe({
      next: (data) => {
        this.categories.set(data);
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isLoading.set(false);
      },
    });
  }

  onSubmit(): void {
    if (this.categoryForm.invalid || this.isSaving()) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const raw = this.categoryForm.getRawValue();
    const payload = {
      name: raw.name.trim(),
      description: raw.description.trim() || null,
    };

    const id = this.editingCategoryId();
    this.isSaving.set(true);
    this.errorMessage.set(null);

    const request$: Observable<unknown> = id
      ? this.categoryService.updateCategory(id, payload)
      : this.categoryService.createCategory(payload);

    request$.subscribe({
      next: () => {
        this.toast.success(id ? 'Category updated.' : 'Category added.');
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

  onEditInit(category: CategoryDto): void {
    this.editingCategoryId.set(category.id);
    this.categoryForm.setValue({
      name: category.name,
      description: category.description ?? '',
    });
    this.focusForm();
  }

  /** DELETE /categories/{id} deactivates; existing tickets keep the category. */
  onDeactivate(category: CategoryDto): void {
    this.confirm
      .ask({
        title: `Deactivate "${category.name}"?`,
        message:
          'It stops being offered on new tickets. Tickets already filed under it keep their category and stay searchable.',
        confirmLabel: 'Deactivate',
        tone: 'danger',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.categoryService.deleteCategory(category.id).subscribe({
          next: () => {
            this.toast.success(`"${category.name}" deactivated.`);
            if (this.editingCategoryId() === category.id) {
              this.resetFormLifecycle();
            } else {
              this.loadCategories();
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
    this.categoryForm.reset({ name: '', description: '' });
    this.editingCategoryId.set(null);
    this.loadCategories();
  }

  cancelEdit(): void {
    this.categoryForm.reset({ name: '', description: '' });
    this.editingCategoryId.set(null);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('active');
  }
}
