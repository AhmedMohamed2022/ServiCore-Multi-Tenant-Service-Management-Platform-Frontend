import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
export const routes: Routes = [
  // Public Identity Workspace Paths
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

  // Protected Enterprise Platform Shell Workspace
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
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      // Fixed: ticket sub-routes are now properly linked and lazy loaded using loadChildren
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
      },
      {
        path: 'management/customers',
        loadComponent: () =>
          import('./features/management/components/client-directory/client-directory.component').then(
            (m) => m.ClientDirectoryComponent,
          ),
      },
      {
        path: 'management/categories',
        loadComponent: () =>
          import('./features/management/components/taxonomy-specs/taxonomy-specs.component').then(
            (m) => m.TaxonomySpecsComponent,
          ),
      },
      // Fallback workspace routing redirection rule
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // Default Fallbacks
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
