export interface CustomerDto {
  id: string;
  name: string;
  email: string;
  organizationId: string;
}

export interface CreateCustomerRequest {
  name: string;
  email: string;
}

export interface UpdateCustomerRequest {
  name: string;
  email: string;
}
