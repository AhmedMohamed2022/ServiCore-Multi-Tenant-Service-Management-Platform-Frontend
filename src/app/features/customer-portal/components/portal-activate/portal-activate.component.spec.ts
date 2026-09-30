import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';

import { PortalActivateComponent } from './portal-activate.component';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { CustomerMembership } from '../../../../core/auth/models/auth.models';
import { environment } from '../../../../../environments/environment';

describe('PortalActivateComponent', () => {
  const mineUrl = `${environment.apiBaseUrl}/customers/mine`;

  const alpha: CustomerMembership = {
    customerId: 'c-alpha',
    organizationId: 'org-alpha',
    organizationName: 'Alpha Support',
  };
  const zulu: CustomerMembership = {
    customerId: 'c-zulu',
    organizationId: 'org-zulu',
    organizationName: 'Zulu Support',
  };

  let fixture: ComponentFixture<PortalActivateComponent>;
  let component: PortalActivateComponent;
  let http: HttpTestingController;
  let tenant: TenantContextService;
  let navigate: jasmine.Spy;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [PortalActivateComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    tenant = TestBed.inject(TenantContextService);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(PortalActivateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // ngOnInit -> GET /customers/mine
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('opens the portal automatically when linked to exactly one organization', () => {
    http.expectOne(mineUrl).flush([alpha]);

    expect(tenant.currentOrganizationId()).toBe('org-alpha');
    expect(tenant.currentCustomerId()).toBe('c-alpha');
    expect(navigate).toHaveBeenCalledWith(['/portal/tickets']);
  });

  it('lets the customer pick when linked to several organizations', () => {
    http.expectOne(mineUrl).flush([alpha, zulu]);

    expect(component.state()).toBe('choose');
    expect(component.memberships()).toEqual([alpha, zulu]);
    expect(tenant.currentOrganizationId()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();

    component.selectMembership(zulu);

    expect(tenant.currentOrganizationId()).toBe('org-zulu');
    expect(tenant.currentCustomerId()).toBe('c-zulu');
    expect(navigate).toHaveBeenCalledWith(['/portal/tickets']);
  });

  it('explains when the account is not linked to any organization', () => {
    http.expectOne(mineUrl).flush([]);

    expect(component.state()).toBe('empty');
    expect(tenant.currentOrganizationId()).toBeNull();
  });

  it('shows a retryable failure (not a manual id form) when the lookup fails, then recovers', () => {
    http
      .expectOne(mineUrl)
      .flush({ error: 'boom' }, { status: 500, statusText: 'Server Error' });

    expect(component.state()).toBe('failed');
    expect(component.failureMessage()).toBeTruthy();
    expect(tenant.currentOrganizationId()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();

    // No free-text organization id entry is offered any more.
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input')).toBeNull();

    component.retry();
    expect(component.state()).toBe('loading');

    http.expectOne(mineUrl).flush([alpha]);

    expect(tenant.currentOrganizationId()).toBe('org-alpha');
    expect(navigate).toHaveBeenCalledWith(['/portal/tickets']);
  });
});
