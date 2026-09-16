/**
 * Mirrors ServiCore.Application.Customers.DTOs.CustomerDto:
 *   CustomerDto(Id, Name, Email, PhoneNumber, IsActive, CreatedAt, UpdatedAt)
 *
 * `organizationId` was declared and is not returned (the organization is
 * already implied by the X-Organization-Id header the tenant interceptor
 * sends). `phoneNumber`, `isActive`, `createdAt` and `updatedAt` are returned
 * and were never declared.
 *
 * `isActive` matters for the UI: DELETE /customers/{id} maps to
 * CustomerService.DeactivateAsync — a soft deactivation, not a delete. The
 * directory used to label that button "Purge", which promises something the
 * API does not do.
 *
 * Note the `Id` here is the Customer *entity* id, not the customer's Identity
 * user id. Customer.UserId exists on the domain entity but is deliberately not
 * exposed on this DTO, which is why a ticket comment's `authorUserId` can
 * never be matched against a customer record. See TicketCommentsComponent.
 */
export interface CustomerDto {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerRequest {
  name: string;
  email: string;
  phoneNumber?: string | null;
}

export interface UpdateCustomerRequest {
  name: string;
  email: string;
  phoneNumber?: string | null;
}
