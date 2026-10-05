import { Routes } from '@angular/router';

export const TICKET_ROUTES: Routes = [
  {
    path: '',
    title: 'Tickets · ServiCore',
    loadComponent: () =>
      import('./components/ticket-list/ticket-list.component').then(
        (m) => m.TicketListComponent,
      ),
  },
  {
    path: 'create',
    title: 'New ticket · ServiCore',
    loadComponent: () =>
      import('./components/ticket-create/ticket-create.component').then(
        (m) => m.TicketCreateComponent,
      ),
  },
  {
    path: ':id',
    title: 'Ticket · ServiCore',
    loadComponent: () =>
      import('./components/ticket-details/ticket-details.component').then(
        (m) => m.TicketDetailsComponent,
      ),
  },
];
