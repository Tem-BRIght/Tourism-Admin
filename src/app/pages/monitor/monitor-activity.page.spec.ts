import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { MonitorActivityPage } from './monitor-activity.page';

describe('MonitorActivityPage', () => {
  let component: MonitorActivityPage;
  let fixture: ComponentFixture<MonitorActivityPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MonitorActivityPage],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(MonitorActivityPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the monitor activity page', () => {
    expect(component).toBeTruthy();
  });

  it('should load stats data', () => {
    expect(component.stats.length).toBeGreaterThan(0);
  });

  it('should load current tours', () => {
    expect(component.currentTours.length).toBeGreaterThan(0);
  });
});
