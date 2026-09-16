export interface CustomerCreateTicketPayload {
  request: {
    categoryId: string;
    title: string;
    description: string;
    priority: number; // Low = 1, Medium = 2, High = 3, Critical = 4
  };
}
