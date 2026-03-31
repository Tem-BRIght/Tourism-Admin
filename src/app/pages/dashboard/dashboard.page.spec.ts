import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { DashboardPage } from './dashboard.page';
import { FirebaseService } from '../../services/firebase.service';

// ── FirebaseService stub ───────────────────────────────────────────────────────

function makeFirebaseSpy(): jasmine.SpyObj<FirebaseService> {
  const spy = jasmine.createSpyObj<FirebaseService>('FirebaseService', [
    'listenToData',
    'getData',
    'writeData',
  ]);
  spy.listenToData.and.returnValue(of(null));
  // getData and writeData are used by the visitorGrowth seeder
  spy.getData.and.returnValue(Promise.resolve(null));
  spy.writeData.and.returnValue(Promise.resolve());
  return spy;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('DashboardPage', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;
  let firebaseSpy: jasmine.SpyObj<FirebaseService>;
  let router: Router;

  beforeEach(async () => {
    firebaseSpy = makeFirebaseSpy();

    await TestBed.configureTestingModule({
      imports: [
        DashboardPage,        // standalone component — import directly
        RouterTestingModule   // provides Router + RouterLink stubs
      ],
      providers: [
        { provide: FirebaseService, useValue: firebaseSpy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Basic ────────────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should read userEmail from localStorage on init', () => {
    localStorage.setItem('userEmail', 'test@example.com');
    component.ngOnInit();
    expect(component.userEmail).toBe('test@example.com');
    localStorage.removeItem('userEmail');
  });

  it('should leave userEmail empty when localStorage has no entry', () => {
    localStorage.removeItem('userEmail');
    component.ngOnInit();
    expect(component.userEmail).toBe('');
  });

  // ── Stats initialisation ──────────────────────────────────────────────────────

  it('should initialise stat counters to zero', () => {
    expect(component.totalTourists).toBe(0);
    expect(component.activeTourGuides).toBe(0);
    expect(component.totalBookings).toBe(0);
    expect(component.satisfactionPercent).toBe(0);
  });

  it('should set totalTourists from users snapshot (fallback when destinations empty)', () => {
    const usersSnapshot = { u1: { id: 'u1' }, u2: { id: 'u2' } };
    firebaseSpy.listenToData.and.callFake((path: string) =>
      path === 'users' ? of(usersSnapshot) : of(null)
    );
    component.ngOnInit();
    // destinations is null → peakHours not built → totalTourists falls back to users count
    expect(component.totalTourists).toBe(2);
  });

  it('should set activeTourGuides from tourGuides snapshot', () => {
    const guidesSnapshot = { g1: { id: 'g1' } };
    firebaseSpy.listenToData.and.callFake((path: string) =>
      path === 'tourGuides' ? of(guidesSnapshot) : of(null)
    );
    component.ngOnInit();
    expect(component.activeTourGuides).toBe(1);
  });

  it('should set totalBookings from bookings snapshot', () => {
    const bookingsSnapshot = { b1: {}, b2: {}, b3: {} };
    firebaseSpy.listenToData.and.callFake((path: string) =>
      path === 'bookings' ? of(bookingsSnapshot) : of(null)
    );
    component.ngOnInit();
    expect(component.totalBookings).toBe(3);
  });

  // ── Satisfaction ──────────────────────────────────────────────────────────────

  it('should compute satisfactionPercent from average rating', () => {
    // ratings: 4 and 5 → avg = 4.5 → 90%
    const feedbackSnapshot = { f1: { rating: 4 }, f2: { rating: 5 } };
    firebaseSpy.listenToData.and.callFake((path: string) =>
      path === 'feedback' ? of(feedbackSnapshot) : of(null)
    );
    component.ngOnInit();
    expect(component.satisfactionPercent).toBe(90);
  });

  it('should clamp satisfactionPercent to 100 for out-of-range ratings', () => {
    const feedbackSnapshot = { f1: { rating: 10 } }; // rating > 5
    firebaseSpy.listenToData.and.callFake((path: string) =>
      path === 'feedback' ? of(feedbackSnapshot) : of(null)
    );
    component.ngOnInit();
    expect(component.satisfactionPercent).toBeLessThanOrEqual(100);
  });

  it('should set satisfactionPercent to 0 when feedback collection is empty', () => {
    firebaseSpy.listenToData.and.returnValue(of(null));
    component.ngOnInit();
    expect(component.satisfactionPercent).toBe(0);
  });

  // ── Destinations ──────────────────────────────────────────────────────────────

  it('should populate mostVisitedLocation with the highest-visitor destination', () => {
    const destinationsSnapshot = {
      d1: { name: 'Beach',  visitors: 300 },
      d2: { name: 'Forest', visitors: 500 },
      d3: { name: 'City',   visitors: 100 }
    };
    firebaseSpy.listenToData.and.callFake((path: string) =>
      path === 'destinations' ? of(destinationsSnapshot) : of(null)
    );
    component.ngOnInit();
    expect(component.mostVisitedLocation).toBe('Forest');
    expect(component.mostVisitedCount).toBe(500);
  });

  it('should limit popularDestinations to 4 items', () => {
    const snap: Record<string, any> = {};
    for (let i = 1; i <= 8; i++) {
      snap[`d${i}`] = { name: `Dest ${i}`, visitors: i * 10, growth: 5 };
    }
    firebaseSpy.listenToData.and.callFake((path: string) =>
      path === 'destinations' ? of(snap) : of(null)
    );
    component.ngOnInit();
    expect(component.popularDestinations.length).toBe(4);
  });

  it('should clear destinations and monitoring when snapshot is empty', () => {
    firebaseSpy.listenToData.and.returnValue(of(null));
    component.ngOnInit();
    expect(component.popularDestinations.length).toBe(0);
    expect(component.monitoringSpots.length).toBe(0);
  });

  // ── Visitor growth bars ───────────────────────────────────────────────────────

  it('should use fallback bars when visitorGrowth collection is empty', () => {
    firebaseSpy.listenToData.and.returnValue(of(null));
    component.ngOnInit();
    expect(component.visitorGrowthBars.length).toBe(6);
    expect(component.visitorGrowthBars.map(b => b.count))
      .toEqual([210, 340, 290, 480, 390, 520]);
    expect(component.visitorGrowthBars[0])
      .toEqual(jasmine.objectContaining({ tooltipVisible: false }));
  });

  it('should use fallback bars on a Firebase error', () => {
    firebaseSpy.listenToData.and.callFake((path: string) =>
      path === 'visitorGrowth' ? throwError(() => new Error('network')) : of(null)
    );
    component.ngOnInit();
    expect(component.visitorGrowthBars.length).toBe(6);
    expect(component.visitorGrowthBars.map(b => b.count))
      .toEqual([210, 340, 290, 480, 390, 520]);
  });

  // ── peakMax getter ────────────────────────────────────────────────────────────

  it('should expose peakMax equal to the highest peakHours value', () => {
    // When destinations snapshot is empty, peakHours is [] and peakMax falls back to 1
    firebaseSpy.listenToData.and.returnValue(of(null));
    component.ngOnInit();
    expect(component.peakMax).toBeGreaterThanOrEqual(1);
  });

  it('should derive peakMax from a real destinations snapshot', () => {
    // With one destination of 180 visitors and peak weight 1.00 (12PM slot),
    // the 12PM slot total should be 180, making peakMax === 180.
    const destinationsSnapshot = {
      d1: { name: 'Park', visitors: 180 }
    };
    firebaseSpy.listenToData.and.callFake((path: string) =>
      path === 'destinations' ? of(destinationsSnapshot) : of(null)
    );
    component.ngOnInit();
    // 12PM slot weight = 1.00 → tourists = round(180 * 1.00) = 180
    expect(component.peakMax).toBe(180);
  });

  // ── Navigation ────────────────────────────────────────────────────────────────

  it('should navigate to the correct route for bookings', () => {
    const spy = spyOn(router, 'navigate');
    component.navigateTo('bookings');
    expect(spy).toHaveBeenCalledWith(['/tourguide']);
  });

  it('should navigate to the correct route for dashboard', () => {
    const spy = spyOn(router, 'navigate');
    component.navigateTo('dashboard');
    expect(spy).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should not navigate for an unknown page key', () => {
    const spy = spyOn(router, 'navigate');
    const warnSpy = spyOn(console, 'warn');
    component.navigateTo('nonexistent');
    expect(spy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  // ── Logout ────────────────────────────────────────────────────────────────────

  it('should remove userEmail from localStorage on logout', () => {
    localStorage.setItem('userEmail', 'test@example.com');
    spyOn(router, 'navigate');
    component.logout();
    expect(localStorage.getItem('userEmail')).toBeNull();
  });

  it('should redirect to /login on logout', () => {
    const spy = spyOn(router, 'navigate');
    component.logout();
    expect(spy).toHaveBeenCalledWith(['/login']);
  });

  // ── Lifecycle teardown ────────────────────────────────────────────────────────

  it('should complete destroy$ and clean up the map on ngOnDestroy', () => {
    const nextSpy     = spyOn((component as any).destroy$, 'next').and.callThrough();
    const completeSpy = spyOn((component as any).destroy$, 'complete').and.callThrough();
    component.ngOnDestroy();
    expect(nextSpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
    expect((component as any).map).toBeNull();
  });
});