import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketCommentsComponent } from './ticket-comments.component';

describe('TicketCommentsComponent', () => {
  let component: TicketCommentsComponent;
  let fixture: ComponentFixture<TicketCommentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketCommentsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TicketCommentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
