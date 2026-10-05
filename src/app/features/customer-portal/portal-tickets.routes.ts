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
        title: 'My tickets · ServiCore',
        canActivate: [portalTenantGuard],
        loadComponent: () =>
          import('./components/portal-ticket-list/portal-ticket-list.component').then(
            (m) => m.PortalTicketListComponent,
          ),
      },
      {
        path: 'tickets/create',
        title: 'New request · ServiCore',
        canActivate: [portalTenantGuard],
        loadComponent: () =>
          import('./components/portal-ticket-create/portal-ticket-create.component').then(
            (m) => m.PortalTicketCreateComponent,
          ),
      },
      {
        path: 'tickets/:id',
        title: 'Ticket · ServiCore',
        canActivate: [portalTenantGuard],
        loadComponent: () =>
          import('./components/portal-ticket-detail/portal-ticket-detail.component').then(
            (m) => m.PortalTicketDetailComponent,
          ),
      },
      {
        path: 'activate-device',
        title: 'Open your portal · ServiCore',
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
