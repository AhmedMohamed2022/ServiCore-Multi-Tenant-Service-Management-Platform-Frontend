import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { managementGuard } from './core/guards/management.guard';
import { reportsGuard } from './core/guards/reports.guard';

export const routes: Routes = [
  // =========================================================================
  // 1. PUBLIC / ANONYMOUS ACCESS PATHWAYS (No authGuard permitted here)
  // =========================================================================
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/components/login/login.component').then(
        (m) => m.LoginComponent,
      ),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/components/register/register.component').then(
        (m) => m.RegisterComponent,
      ),
  },
  {
    path: 'accept-invitation',
    loadComponent: () =>
      import('./features/auth/components/accept-staff-invitation/accept-staff-invitation.component').then(
        (m) => m.AcceptStaffInvitationComponent,
      ),
  },
  {
    path: 'accept-customer-invitation',
    loadComponent: () =>
      import('./features/auth/components/accept-customer-invitation/accept-customer-invitation.component').then(
        (m) => m.AcceptCustomerInvitationComponent,
      ),
  },
  {
    path: 'select-organization',
    loadComponent: () =>
      import('./features/auth/components/select-organization/select-organization.component').then(
        (m) => m.SelectOrganizationComponent,
      ),
    canActivate: [authGuard],
  },

  // =========================================================================
  // 2. PROTECTED INTERNAL SQUAD PLATFORM WORKSPACE (Staff / Operators Only)
  // =========================================================================
  {
    path: 'app',
    loadComponent: () =>
      import('./features/shell/components/app-shell/app-shell.component').then(
        (m) => m.AppShellComponent,
      ),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        canActivate: [reportsGuard],
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'tickets',
        loadChildren: () =>
          import('./features/tickets/tickets.routes').then(
            (m) => m.TICKET_ROUTES,
          ),
      },
      {
        path: 'management/teams',
        loadComponent: () =>
          import('./features/management/components/team-roster/team-roster.component').then(
            (m) => m.TeamRosterComponent,
          ),
        canActivate: [managementGuard],
      },
      {
        path: 'management/customers',
        loadComponent: () =>
          import('./features/management/components/client-directory/client-directory.component').then(
            (m) => m.ClientDirectoryComponent,
          ),
        canActivate: [managementGuard],
      },
      {
        path: 'management/categories',
        loadComponent: () =>
          import('./features/management/components/taxonomy-specs/taxonomy-specs.component').then(
            (m) => m.TaxonomySpecsComponent,
          ),
        canActivate: [managementGuard],
      },
      {
        path: 'management/invitations',
        loadComponent: () =>
          import('./features/management/components/invitations-console/invitations-console.component').then(
            (m) => m.InvitationsConsoleComponent,
          ),
        canActivate: [managementGuard],
      },
      {
        path: 'reports/tickets',
        canActivate: [reportsGuard],
        loadComponent: () =>
          import('./features/dashboard/views/ticket-statistics/ticket-statistics.component').then(
            (m) => m.TicketStatisticsComponent,
          ),
      },
      {
        path: 'reports/teams',
        canActivate: [reportsGuard],
        loadComponent: () =>
          import('./features/dashboard/views/team-statistics/team-statistics.component').then(
            (m) => m.TeamStatisticsComponent,
          ),
      },
      {
        path: 'reports/agents',
        canActivate: [reportsGuard],
        loadComponent: () =>
          import('./features/dashboard/views/agent-statistics/agent-statistics.component').then(
            (m) => m.AgentStatisticsComponent,
          ),
      },
      {
        path: 'reports/customers',
        canActivate: [reportsGuard],
        loadComponent: () =>
          import('./features/dashboard/views/customer-statistics/customer-statistics.component').then(
            (m) => m.CustomerStatisticsComponent,
          ),
      },
      {
        path: 'reports/categories',
        canActivate: [reportsGuard],
        loadComponent: () =>
          import('./features/dashboard/views/category-statistics/category-statistics.component').then(
            (m) => m.CategoryStatisticsComponent,
          ),
      },
      {
        path: 'reports/time-series',
        canActivate: [reportsGuard],
        loadComponent: () =>
          import('./features/dashboard/views/ticket-time-series/ticket-time-series.component').then(
            (m) => m.TicketTimeSeriesComponent,
          ),
      },

      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // =========================================================================
  // 3. PROTECTED CLIENT HUB PORTAL WORKSPACE (Isolated Customers Only)
  // =========================================================================
  {
    path: 'portal',
    loadChildren: () =>
      import('./features/customer-portal/portal-tickets.routes').then(
        (m) => m.PORTAL_ROUTES,
      ),
    canActivate: [authGuard],
  },

  // =========================================================================
  // 4. MASTER FALLBACK SYSTEM WILDCARDS
  // =========================================================================
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
