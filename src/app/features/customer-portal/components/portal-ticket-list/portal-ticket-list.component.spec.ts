import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PortalTicketListComponent } from './portal-ticket-list.component';

describe('PortalTicketListComponent', () => {
  let component: PortalTicketListComponent;
  let fixture: ComponentFixture<PortalTicketListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalTicketListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PortalTicketListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
