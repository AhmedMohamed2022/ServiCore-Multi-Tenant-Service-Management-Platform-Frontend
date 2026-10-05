import { SkipLinkDirective } from '../../shared/ui/skip-link/skip-link.directive';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { IconComponent } from '../../shared/ui/icon/icon.component';

/** Public marketing page at `/`. Styles live in landing.component.scss. */
@Component({
  selector: 'sc-landing',
  standalone: true,
  imports: [RouterLink, IconComponent, SkipLinkDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent {
  protected readonly auth = inject(AuthService);
  protected readonly year = new Date().getFullYear();

  protected readonly repos = {
    frontend:
      'https://github.com/AhmedMohamed2022/ServiCore-Multi-Tenant-Service-Management-Platform-Frontend',
    backend:
      'https://github.com/AhmedMohamed2022/ServiCore-Multi-Tenant-Service-Management-Platform-Backend',
  };

  protected readonly stats = [
    { value: '3', label: 'Dedicated workspaces' },
    { value: '6', label: 'Workflow stages' },
    { value: '6', label: 'Report views' },
    { value: '100%', label: 'Tenant-isolated data' },
  ];

  protected readonly sidebar = [
    'dashboard',
    'confirmation_number',
    'groups',
    'monitoring',
    'settings',
  ];

  protected readonly preview = [
    {
      title: 'Printer offline on floor 3',
      team: 'IT Support',
      priority: 'High',
      pc: 'sc-badge-warn',
      status: 'In progress',
      sc: 'sc-badge-info',
    },
    {
      title: 'Invoice mismatch #4021',
      team: 'Billing',
      priority: 'Medium',
      pc: 'sc-badge-neutral',
      status: 'Waiting',
      sc: 'sc-badge-warn',
    },
    {
      title: 'Cannot reset password',
      team: 'IT Support',
      priority: 'Critical',
      pc: 'sc-badge-danger',
      status: 'Open',
      sc: 'sc-badge-info',
    },
    {
      title: 'Update delivery address',
      team: 'Operations',
      priority: 'Low',
      pc: 'sc-badge-neutral',
      status: 'Resolved',
      sc: 'sc-badge-success',
    },
  ];

  protected readonly bars = [38, 62, 45, 78, 56, 90, 70];

  protected readonly features = [
    {
      icon: 'domain',
      title: 'True multi-tenancy',
      body: 'Every organization is isolated at the API. Users can belong to several and switch between them in one click.',
      wide: true,
    },
    {
      icon: 'notifications_active',
      title: 'Realtime updates',
      body: 'SignalR pushes notifications and comments instantly.',
      wide: false,
    },
    {
      icon: 'groups',
      title: 'Team routing',
      body: 'Route to teams, assign to agents, keep unassigned work visible.',
      wide: false,
    },
    {
      icon: 'shield',
      title: 'Role-based access',
      body: 'Owner, Manager and Agent permissions enforced by client guards and server policies.',
      wide: false,
    },
    {
      icon: 'monitoring',
      title: 'Reporting dashboards',
      body: 'Ticket, team, agent, customer, category and time-series reports over any date range.',
      wide: true,
    },
    {
      icon: 'mail',
      title: 'Invitation flows',
      body: 'Invite staff and customers by email with preview and accept steps.',
      wide: false,
    },
  ];

  protected readonly roles = [
    {
      icon: 'support_agent',
      name: 'Agent',
      tag: 'Staff workspace',
      points: [
        'Works tickets assigned to them',
        'Start, wait for customer, resolve',
        'Comments with live updates',
      ],
    },
    {
      icon: 'admin_panel_settings',
      name: 'Owner / Manager',
      tag: 'Management console',
      points: [
        'Manage teams, customers, categories',
        'Invite staff and customers',
        'Open and close tickets, full reporting',
      ],
    },
    {
      icon: 'person',
      name: 'Customer',
      tag: 'Isolated portal',
      points: [
        'Raise and follow their own tickets',
        'Sees only their own data',
        'Separate sign-in experience',
      ],
    },
  ];

  protected readonly lifecycle = [
    'New',
    'Open',
    'In progress',
    'Waiting for customer',
    'Resolved',
    'Closed',
  ];
}
