import { Routes } from '@angular/router';

export const TICKET_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/ticket-list/ticket-list.component').then(
        (m) => m.TicketListComponent,
      ),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./components/ticket-create/ticket-create.component').then(
        (m) => m.TicketCreateComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./components/ticket-details/ticket-details.component').then(
        (m) => m.TicketDetailsComponent,
      ),
  },
];
