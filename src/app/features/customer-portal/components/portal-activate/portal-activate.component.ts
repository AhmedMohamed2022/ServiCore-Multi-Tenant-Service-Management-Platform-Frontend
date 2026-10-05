import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { CustomerAccessService } from '../../../../core/services/customer-access.service';
import { CustomerMembership } from '../../../../core/auth/models/auth.models';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
import { AlertComponent } from '../../../../shared/ui/states/states.component';

type ActivationState = 'loading' | 'choose' | 'empty' | 'failed';

@Component({
  selector: 'app-portal-activate',
  standalone: true,
  imports: [IconComponent, AvatarComponent, AlertComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portal-activate.component.html',
})
export class PortalActivateComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly tenantContext = inject(TenantContextService);
  private readonly customerAccess = inject(CustomerAccessService);

  // 'loading' — asking GET /customers/mine which organizations this account
  //             is linked to.
  // 'choose'  — more than one linked organization; let the person pick.
  // 'empty'   — the lookup worked but found nothing (e.g. the invitation was
  //             never accepted).
  // 'failed'  — the lookup itself failed (server or network). The person can
  //             retry; we deliberately do NOT fall back to typing an
  //             organization id by hand. Organization ids are internal, a
  //             customer has no way to know one, and a hand-entered id skips
  //             the customerId that the rest of the portal keys off (ticket
  //             comment attribution, notification deep links).
  readonly state = signal<ActivationState>('loading');
  readonly memberships = signal<CustomerMembership[]>([]);
  readonly failureMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  retry(): void {
    this.load();
  }

  selectMembership(membership: CustomerMembership): void {
    this.activate(membership);
  }

  private load(): void {
    this.state.set('loading');
    this.failureMessage.set(null);

    this.customerAccess.getMine().subscribe({
      next: (memberships) => {
        if (memberships.length === 1) {
          this.activate(memberships[0]);
          return;
        }

        if (memberships.length > 1) {
          this.memberships.set(memberships);
          this.state.set('choose');
          return;
        }

        this.state.set('empty');
      },
      error: (err: Error) => {
        this.failureMessage.set(err.message);
        this.state.set('failed');
      },
    });
  }

  private activate(membership: CustomerMembership): void {
    this.tenantContext.setOrganization(
      membership.organizationId,
      membership.customerId,
    );
    this.router.navigate(['/portal/tickets']);
  }
}
