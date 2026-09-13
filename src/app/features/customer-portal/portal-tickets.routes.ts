import { Routes } from '@angular/router';

export const PORTAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/portal-shell/portal-shell.component').then(
        (m) => m.PortalShellComponent,
      ),
    children: [
      {
        path: 'tickets',
        loadComponent: () =>
          import('./components/portal-ticket-list/portal-ticket-list.component').then(
            (m) => m.PortalTicketListComponent,
          ),
      },
      {
        path: 'tickets/create',
        loadComponent: () =>
          import('./components/portal-ticket-create/portal-ticket-create.component').then(
            (m) => m.PortalTicketCreateComponent,
          ),
      },
      {
        path: 'tickets/:id',
        loadComponent: () =>
          import('../tickets/components/ticket-details/ticket-details.component').then(
            (m) => m.TicketDetailsComponent,
          ),
      },
      {
        path: 'activate-device',
        loadComponent: () =>
          import('./components/portal-activate/portal-activate.component').then(
            (m) => m.PortalActivateComponent,
          ),
      },
      { path: '', redirectTo: 'tickets', pathMatch: 'full' },
    ],
  },
];
