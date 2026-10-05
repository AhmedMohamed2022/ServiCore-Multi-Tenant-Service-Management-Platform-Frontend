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
    title: 'Sign in · ServiCore',
    loadComponent: () =>
      import('./features/auth/components/login/login.component').then(
        (m) => m.LoginComponent,
      ),
  },
  {
    path: 'register',
    title: 'Create your organization · ServiCore',
    loadComponent: () =>
      import('./features/auth/components/register/register.component').then(
        (m) => m.RegisterComponent,
      ),
  },
  {
    path: 'accept-invitation',
    title: 'Accept staff invitation · ServiCore',
    loadComponent: () =>
      import('./features/auth/components/accept-staff-invitation/accept-staff-invitation.component').then(
        (m) => m.AcceptStaffInvitationComponent,
      ),
  },
  {
    path: 'accept-customer-invitation',
    title: 'Accept invitation · ServiCore',
    loadComponent: () =>
      import('./features/auth/components/accept-customer-invitation/accept-customer-invitation.component').then(
        (m) => m.AcceptCustomerInvitationComponent,
      ),
  },
  {
    path: 'select-organization',
    title: 'Choose an organization · ServiCore',
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
        title: 'Dashboard · ServiCore',
        canActivate: [reportsGuard],
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'tickets',
        title: 'Tickets · ServiCore',
        loadChildren: () =>
          import('./features/tickets/tickets.routes').then(
            (m) => m.TICKET_ROUTES,
          ),
      },
      {
        path: 'management/teams',
        title: 'Teams · ServiCore',
        loadComponent: () =>
          import('./features/management/components/team-roster/team-roster.component').then(
            (m) => m.TeamRosterComponent,
          ),
        canActivate: [managementGuard],
      },
      {
        path: 'management/customers',
        title: 'Customers · ServiCore',
        loadComponent: () =>
          import('./features/management/components/client-directory/client-directory.component').then(
            (m) => m.ClientDirectoryComponent,
          ),
        canActivate: [managementGuard],
      },
      {
        path: 'management/categories',
        title: 'Categories · ServiCore',
        loadComponent: () =>
          import('./features/management/components/taxonomy-specs/taxonomy-specs.component').then(
            (m) => m.TaxonomySpecsComponent,
          ),
        canActivate: [managementGuard],
      },
      {
        path: 'management/invitations',
        title: 'Invitations · ServiCore',
        loadComponent: () =>
          import('./features/management/components/invitations-console/invitations-console.component').then(
            (m) => m.InvitationsConsoleComponent,
          ),
        canActivate: [managementGuard],
      },
      {
        path: 'reports/tickets',
        title: 'Ticket report · ServiCore',
        canActivate: [reportsGuard],
        loadComponent: () =>
          import('./features/dashboard/views/ticket-statistics/ticket-statistics.component').then(
            (m) => m.TicketStatisticsComponent,
          ),
      },
      {
        path: 'reports/teams',
        title: 'Team report · ServiCore',
        canActivate: [reportsGuard],
        loadComponent: () =>
          import('./features/dashboard/views/team-statistics/team-statistics.component').then(
            (m) => m.TeamStatisticsComponent,
          ),
      },
      {
        path: 'reports/agents',
        title: 'Agent report · ServiCore',
        canActivate: [reportsGuard],
        loadComponent: () =>
          import('./features/dashboard/views/agent-statistics/agent-statistics.component').then(
            (m) => m.AgentStatisticsComponent,
          ),
      },
      {
        path: 'reports/customers',
        title: 'Customer report · ServiCore',
        canActivate: [reportsGuard],
        loadComponent: () =>
          import('./features/dashboard/views/customer-statistics/customer-statistics.component').then(
            (m) => m.CustomerStatisticsComponent,
          ),
      },
      {
        path: 'reports/categories',
        title: 'Category report · ServiCore',
        canActivate: [reportsGuard],
        loadComponent: () =>
          import('./features/dashboard/views/category-statistics/category-statistics.component').then(
            (m) => m.CategoryStatisticsComponent,
          ),
      },
      {
        path: 'reports/time-series',
        title: 'Ticket trends · ServiCore',
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
  {
    path: '',
    pathMatch: 'full',
    title: 'ServiCore · Service management',
    loadComponent: () =>
      import('./features/landing/landing.component').then(
        (m) => m.LandingComponent,
      ),
  },
  {
    path: '**',
    title: 'Page not found · ServiCore',
    loadComponent: () =>
      import('./shared/pages/not-found/not-found.component').then(
        (m) => m.NotFoundComponent,
      ),
  },
];
