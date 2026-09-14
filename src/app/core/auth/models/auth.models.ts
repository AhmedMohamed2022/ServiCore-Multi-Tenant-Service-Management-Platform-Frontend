export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  organizationName: string;
}

export interface RegisterResponse {
  userId: string;
  organizationId: string;
  organizationName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface UserMeResponse {
  userId: string;
  email: string;
}
export interface OrganizationSummary {
  id: string;
  name: string;
  createdAt: string;
}

// One entry per organization a customer's account is linked to.
// Returned by GET /customers/mine — see CustomerAccessService.
export interface CustomerMembership {
  customerId: string;
  organizationId: string;
  organizationName: string;
}
