export interface CategoryDto {
  id: string;
  name: string;
  organizationId: string;
}

export interface CreateCategoryRequest {
  name: string;
}

export interface UpdateCategoryRequest {
  name: string;
}
