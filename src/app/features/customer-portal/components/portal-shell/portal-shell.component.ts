import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { CustomerMembership } from '../../../../core/auth/models/auth.models';
import { CustomerAccessService } from '../../../../core/services/customer-access.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { NotificationTrayComponent } from '../../../shell/components/notification-tray/notification-tray.component';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';

/**
 * The customer portal shares ServiCore's design system but deliberately not
 * its staff layout (§15). Customers get a light, single-row top bar and a
 * centred content column rather than an operational sidebar — there is nothing
 * here to justify the density of the staff shell.
 *
 * The bar names the service provider the customer is writing to. The name
 * comes from GET /customers/mine (the same endpoint activation uses), matched
 * on the active organization id. It is best-effort: if the call fails the bar
 * simply omits the name.
 */
@Component({
  selector: 'app-portal-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatMenuModule,
    NotificationTrayComponent,
    AvatarComponent,
    IconComponent,
  ],
  templateUrl: './portal-shell.component.html',
  styleUrls: ['./portal-shell.component.css'],
})
export class PortalShellComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly customerAccess = inject(CustomerAccessService);
  private readonly tenantContext = inject(TenantContextService);

  readonly customerEmail = computed(
    () => this.authService.currentUser()?.email ?? '',
  );

  readonly memberships = signal<CustomerMembership[]>([]);

  /** The provider the customer is currently writing to, when it is known. */
  readonly organizationName = computed(() => {
    const active = this.tenantContext.currentOrganizationId();
    if (!active) return '';
    return (
      this.memberships().find((m) => m.organizationId === active)
        ?.organizationName ?? ''
    );
  });

  /** Only offered when there is actually somewhere else to switch to. */
  readonly canSwitchOrganization = computed(
    () => this.memberships().length > 1,
  );

  readonly year = new Date().getFullYear();

  ngOnInit(): void {
    this.customerAccess
      .getMine()
      .pipe(catchError(() => of([] as CustomerMembership[])))
      .subscribe((memberships) => this.memberships.set(memberships));
  }

  onLogout(): void {
    this.authService.logout();
  }
}
