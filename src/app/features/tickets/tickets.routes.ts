import { Routes } from '@angular/router';
import { managementGuard } from '../../core/guards/management.guard';

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
    canActivate: [managementGuard],
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
