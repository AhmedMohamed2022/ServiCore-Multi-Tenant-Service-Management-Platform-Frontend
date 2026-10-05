import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PortalTicketCreateComponent } from './portal-ticket-create.component';

describe('PortalTicketCreateComponent', () => {
  let component: PortalTicketCreateComponent;
  let fixture: ComponentFixture<PortalTicketCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalTicketCreateComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PortalTicketCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
