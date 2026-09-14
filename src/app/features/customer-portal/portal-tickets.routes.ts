import { Routes } from '@angular/router';
import { portalTenantGuard } from '../../core/guards/portal-tenant.guard';

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
        canActivate: [portalTenantGuard],
        loadComponent: () =>
          import('./components/portal-ticket-list/portal-ticket-list.component').then(
            (m) => m.PortalTicketListComponent,
          ),
      },
      {
        path: 'tickets/create',
        canActivate: [portalTenantGuard],
        loadComponent: () =>
          import('./components/portal-ticket-create/portal-ticket-create.component').then(
            (m) => m.PortalTicketCreateComponent,
          ),
      },
      {
        path: 'tickets/:id',
        canActivate: [portalTenantGuard],
        loadComponent: () =>
          import('../tickets/components/ticket-details/ticket-details.component').then(
            (m) => m.TicketDetailsComponent,
          ),
      },
      {
        path: 'activate-device',
        // Deliberately no portalTenantGuard here — this is the one route a
        // tenant-less customer must always be able to reach.
        loadComponent: () =>
          import('./components/portal-activate/portal-activate.component').then(
            (m) => m.PortalActivateComponent,
          ),
      },
      { path: '', redirectTo: 'tickets', pathMatch: 'full' },
    ],
  },
];
