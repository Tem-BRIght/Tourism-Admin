import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { FeedbackRatingsPage } from './feedback-rating.page';

describe('FeedbackRatingsPage', () => {
  let component: FeedbackRatingsPage;
  let fixture: ComponentFixture<FeedbackRatingsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FeedbackRatingsPage],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(FeedbackRatingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the feedback ratings page', () => {
    expect(component).toBeTruthy();
  });

  it('should load popular tourist spots', () => {
    expect(component.popularSpots.length).toBeGreaterThan(0);
  });

  it('should load reviews', () => {
    expect(component.reviews.length).toBeGreaterThan(0);
  });
});
