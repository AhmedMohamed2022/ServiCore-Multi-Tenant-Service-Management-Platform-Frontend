export interface InviteOrganizationMemberRequest {
  email: string;
  role: number; // Owner = 1, Manager = 2, Agent = 3
}

export interface InviteCustomerRequest {
  customerId: string; // Strictly maps to Guid CustomerId in backend record
}

export interface OrganizationInvitationDto {
  id: string;
  email: string;
  role: number;
  isAccepted: boolean;
  createdAt: string;
}
