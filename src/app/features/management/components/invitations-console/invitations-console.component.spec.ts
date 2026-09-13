import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvitationsConsoleComponent } from './invitations-console.component';

describe('InvitationsConsoleComponent', () => {
  let component: InvitationsConsoleComponent;
  let fixture: ComponentFixture<InvitationsConsoleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvitationsConsoleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvitationsConsoleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
