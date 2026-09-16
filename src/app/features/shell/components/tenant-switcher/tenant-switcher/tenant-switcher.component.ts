import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { TenantContextService } from '../../../../../core/services/tenant-context.service';
import { OrganizationService } from '../../../../../core/services/organization.service';
import { OrganizationDto } from '../../../../management/models/organization.model';
import { AvatarComponent } from '../../../../../shared/ui/avatar/avatar.component';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';

@Component({
  selector: 'app-tenant-switcher',
  standalone: true,
  imports: [MatMenuModule, AvatarComponent, IconComponent],
  template: `
    <button
      type="button"
      class="group flex w-full items-center gap-2.5 rounded-sc px-2 py-2 text-left
             transition-colors hover:bg-white/5"
      [matMenuTriggerFor]="orgMenu"
      [disabled]="organizations().length === 0"
      aria-label="Switch organization">
      <sc-avatar [name]="activeOrganizationName()" size="sm" />

      <span class="min-w-0 flex-1">
        <span class="block truncate text-[13px] font-semibold text-white">
          {{ activeOrganizationName() || 'No organization' }}
        </span>
        <span class="block text-2xs text-slate-400">
          @if (organizations().length > 1) {
            {{ organizations().length }} organizations
          } @else {
            Organization
          }
        </span>
      </span>

      @if (organizations().length > 1) {
        <sc-icon name="unfold_more" size="sm" class="text-slate-400" />
      }
    </button>

    <mat-menu #orgMenu="matMenu" class="sc-menu">
      <div class="px-3 pb-1.5 pt-2 text-2xs font-semibold uppercase tracking-wider text-ink-subtle">
        Switch organization
      </div>
      @for (org of organizations(); track org.id) {
        <button
          type="button"
          mat-menu-item
          class="!h-11"
          (click)="onSelectTenant(org.id)"
          [attr.aria-current]="org.id === tenantContext.currentOrganizationId() ? 'true' : null">
          <span class="flex items-center gap-2.5">
            <sc-avatar [name]="org.name" size="xs" />
            <span class="flex-1 truncate text-[13px]">{{ org.name }}</span>
            @if (org.id === tenantContext.currentOrganizationId()) {
              <sc-icon name="check" size="sm" class="text-brand-600" />
            }
          </span>
        </button>
      }
    </mat-menu>
  `,
})
export class TenantSwitcherComponent implements OnInit {
  protected readonly tenantContext = inject(TenantContextService);
  private readonly orgService = inject(OrganizationService);

  readonly organizations = signal<OrganizationDto[]>([]);

  readonly activeOrganizationName = computed(() => {
    const activeId = this.tenantContext.currentOrganizationId();
    return this.organizations().find((org) => org.id === activeId)?.name ?? '';
  });

  ngOnInit(): void {
    this.orgService.getUserOrganizations().subscribe({
      next: (data) => {
        this.organizations.set(data);

        // Auto-select first tenant context if local storage cache is unassigned
        if (!this.tenantContext.currentOrganizationId() && data.length > 0) {
          this.tenantContext.setOrganization(data[0].id);
        }
      },
    });
  }

  onSelectTenant(organizationId: string): void {
    if (organizationId === this.tenantContext.currentOrganizationId()) return;

    this.tenantContext.setOrganization(organizationId);
    // Unchanged from the previous implementation: a hard reload is the
    // existing mechanism for resetting all cached state under the new
    // organization header context.
    window.location.reload();
  }
}
