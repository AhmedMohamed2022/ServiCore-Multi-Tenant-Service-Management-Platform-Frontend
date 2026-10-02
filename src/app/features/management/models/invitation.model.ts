export interface InviteOrganizationMemberRequest {
  email: string;
  role: number; // Owner = 1, Manager = 2, Agent = 3
}

export interface InviteCustomerRequest {
  customerId: string; // Strictly maps to Guid CustomerId in backend record
}

/** GET /api/organization/invitations/preview?token=... (anonymous) */
export interface StaffInvitationPreview {
  email: string;
  role: string;
  /** True when the invited email already has a ServiCore account. */
  userExists: boolean;
}

/** GET /api/customer-invitations/preview?token=... (anonymous) */
export interface CustomerInvitationPreview {
  email: string;
  userExists: boolean;
}

/** Body returned by both anonymous accept endpoints. */
export interface AcceptInvitationResponse {
  message: string;
  /** True when the account already existed and its password was left untouched. */
  existingAccount: boolean;
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
