import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NumberOfTouristPage } from './number-of-tourist.page';

describe('NumberOfTouristPage', () => {
  let component: NumberOfTouristPage;
  let fixture: ComponentFixture<NumberOfTouristPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NumberOfTouristPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
