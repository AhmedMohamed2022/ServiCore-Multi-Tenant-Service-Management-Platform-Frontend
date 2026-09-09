import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoryService } from '../../../../core/services/category.service';
import { CategoryDto } from '../../models/category.model';

@Component({
  selector: 'app-taxonomy-specs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './taxonomy-specs.component.html',
  styleUrls: ['./taxonomy-specs.component.css'],
})
export class TaxonomySpecsComponent implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly fb = inject(FormBuilder);

  // Structural Signals tracking state data trees
  readonly categories = signal<CategoryDto[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isEditing = signal<boolean>(false);
  readonly editingCategoryId = signal<string | null>(null);

  // Operational Form Controls
  readonly categoryForm = this.fb.nonNullable.group({
    name: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(50)],
    ],
  });

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading.set(true);
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
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const payload = this.categoryForm.getRawValue();
    const id = this.editingCategoryId();

    if (this.isEditing() && id) {
      this.categoryService.updateCategory(id, payload).subscribe({
        next: () => this.resetFormLifecycle(),
        error: (err: Error) => this.errorMessage.set(err.message),
      });
    } else {
      this.categoryService.createCategory(payload).subscribe({
        next: () => this.resetFormLifecycle(),
        error: (err: Error) => this.errorMessage.set(err.message),
      });
    }
  }

  onEditInit(category: CategoryDto): void {
    this.isEditing.set(true);
    this.editingCategoryId.set(category.id);
    this.categoryForm.patchValue({
      name: category.name,
    });
  }

  onDelete(id: string): void {
    if (
      confirm(
        'Are you sure you want to permanently delete this service ticket category label?',
      )
    ) {
      this.categoryService.deleteCategory(id).subscribe({
        next: () => this.loadCategories(),
        error: (err: Error) => this.errorMessage.set(err.message),
      });
    }
  }

  resetFormLifecycle(): void {
    this.categoryForm.reset();
    this.isEditing.set(false);
    this.editingCategoryId.set(null);
    this.loadCategories();
  }
}
