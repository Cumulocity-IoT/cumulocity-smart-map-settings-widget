import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MarkerDetailPopupComponent } from './sms-marker-detail-popup.component';

describe('MarkerDetailPopupComponent', () => {
  let component: MarkerDetailPopupComponent;
  let fixture: ComponentFixture<MarkerDetailPopupComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MarkerDetailPopupComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MarkerDetailPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
