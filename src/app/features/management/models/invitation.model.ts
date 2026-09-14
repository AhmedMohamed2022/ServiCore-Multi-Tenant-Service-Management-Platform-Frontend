export interface InviteOrganizationMemberRequest {
  email: string;
  role: number; // Owner = 1, Manager = 2, Agent = 3
}

export interface InviteCustomerRequest {
  customerId: string; // Strictly maps to Guid CustomerId in backend record
}

export interface OrganizationInvitationDto {
  id: string;
  organizationId: string;
  email: string;
  role: string; // Backend serializes the enum via .ToString(), e.g. "Manager" / "Agent"
  createdAt: string;
  expiresAt: string;
  isAccepted: boolean;
  isRevoked: boolean;
}
