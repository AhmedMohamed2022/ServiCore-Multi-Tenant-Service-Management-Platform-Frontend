/**
 * Mirrors ServiCore.Application.Categories.DTOs.CategoryDto:
 *   CategoryDto(Id, Name, Description, IsActive, CreatedAt, UpdatedAt)
 *
 * `organizationId` was declared and is not returned. `description`,
 * `isActive`, `createdAt` and `updatedAt` are returned and were not declared —
 * including `description`, which the create/update endpoints accept, so the
 * form had no way to set a field the API has always supported.
 *
 * As with customers, DELETE /categories/{id} deactivates rather than deletes.
 */
export interface CategoryDto {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string | null;
}

export interface UpdateCategoryRequest {
  name: string;
  description?: string | null;
}
