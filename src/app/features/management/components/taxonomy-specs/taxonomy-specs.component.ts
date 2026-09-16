import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Observable } from 'rxjs';

import { CategoryService } from '../../../../core/services/category.service';
import { CategoryDto } from '../../models/category.model';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import {
  AlertComponent,
  EmptyStateComponent,
  LoadingStateComponent,
} from '../../../../shared/ui/states/states.component';
import { ConfirmService } from '../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

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
    LoadingStateComponent,
  ],
  templateUrl: './taxonomy-specs.component.html',
  styleUrls: ['./taxonomy-specs.component.css'],
})
export class TaxonomySpecsComponent implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly categories = signal<CategoryDto[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly editingCategoryId = signal<string | null>(null);

  readonly searchTerm = signal<string>('');
  readonly showInactive = signal<boolean>(false);

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

  readonly visibleCategories = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const includeInactive = this.showInactive();

    return this.categories()
      .filter((category) => includeInactive || category.isActive)
      .filter(
        (category) =>
          !term ||
          category.name.toLowerCase().includes(term) ||
          (category.description ?? '').toLowerCase().includes(term),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly hasFilters = computed(
    () => this.searchTerm().trim().length > 0 || this.showInactive(),
  );

  ngOnInit(): void {
    this.loadCategories();
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
    this.showInactive.set(false);
  }
}
