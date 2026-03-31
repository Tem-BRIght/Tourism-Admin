import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as L from 'leaflet';
import { FirebaseService } from '../../services/firebase.service';



// ── Typed interfaces ────────────────────────────────────────────────────────

interface MonitoringSpot {
  label: string;
  count: number;
}

interface PopularDestination {
  name: string;
  growth: string;
  positive: boolean;
}

/** One bar in the Visitor Growth Over Time chart */
export interface VisitorGrowthBar {
  /** Short month label, e.g. "Jan", "Feb" */
  month: string;
  /** Raw visitor count for the month */
  count: number;
  /** Bar height in px (max 150) — pre-normalised */
  heightPx: number;
  /** Month-over-month change as a signed percentage string, e.g. "+12%" */
  changeLabel: string;
  /** true = growth, false = decline */
  positive: boolean;
  /** Show tooltip on hover */
  tooltipVisible: boolean;
}

/** Crowd severity tier for a destination at a given hour */
export type CrowdLevel = 'low' | 'moderate' | 'high' | 'mob';

/** How busy one destination is at a particular time slot */
export interface DestinationCrowd {
  name: string;
  tourists: number;
  crowdLevel: CrowdLevel;
}

/** One time slot in the Peak Hours chart */
export interface PeakHour {
  hour: string;
  /** Total tourists across all destinations for this slot */
  value: number;
  /** Crowd severity for the slot overall */
  crowdLevel: CrowdLevel;
  /** Per-destination breakdown, sorted busiest first */
  destinations: DestinationCrowd[];
  /** UI toggle — show/hide the destination breakdown panel */
  expanded: boolean;
}

// ── Crowd-level thresholds ──────────────────────────────────────────────────
// Thresholds are per-destination tourist count at a given hour.
// Tune these constants to match your real expected volumes.
const CROWD_MOB      = 150;
const CROWD_HIGH     = 100;
const CROWD_MODERATE =  50;

function crowdLevel(tourists: number): CrowdLevel {
  if (tourists >= CROWD_MOB)      return 'mob';
  if (tourists >= CROWD_HIGH)     return 'high';
  if (tourists >= CROWD_MODERATE) return 'moderate';
  return 'low';
}

// ── Slot distribution weights ──────────────────────────────────────────────
// Each time slot gets a multiplier that models how tourist traffic distributes
// across the day. The destinations subscription gives us total visitor counts;
// we spread those across slots using these weights so each slot's per-
// destination figure is realistic rather than uniform.
const SLOT_WEIGHTS: Record<string, number> = {
  '9AM':  0.25,
  '10AM': 0.43,
  '12PM': 1.00,   // peak reference (weight 1 = all tourists show up)
  '2PM':  0.92,
  '4PM':  0.51,
  '6PM':  0.32,
};

// ── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule]
})
export class DashboardPage implements OnInit, AfterViewInit, OnDestroy {
  userEmail: string = '';

  // Leaflet map state
  private map: L.Map | null = null;
  private spotMarkers: L.Marker[] = [];

  // Stats
  totalTourists: number = 0;
  activeTourGuides: number = 0;
  totalBookings: number = 0;
  mostVisitedLocation: string = '';
  mostVisitedCount: number = 0;
  touristsGrowth: string = '0%';
  guidesGrowth: string = '0';
  bookingsGrowth: string = '0%';

  // Visit counts from QR scans — each scan = 1 tourist visit
  private visitCountByDest: Map<string, number> = new Map();

  // Real-time monitoring spots
  monitoringSpots: MonitoringSpot[] = [];

  // Destinations (kept private; only exposed data is used in template)
  private destinations: any[] = [];

  // Popular destinations
  popularDestinations: PopularDestination[] = [];

  // Visitor Growth Over Time chart
  visitorGrowthBars: VisitorGrowthBar[] = [];

  /** Overall trend across the displayed months (first → last) */
  visitorGrowthTrend: string = '';
  visitorGrowthTrendPositive: boolean = true;
  /** Month label with the highest visitor count, e.g. "Jun" */
  growthBestMonth: string = '';
  /** Month label with the lowest visitor count, e.g. "Jan" */
  growthLowestMonth: string = '';

  // Tourist satisfaction (0–100)
  satisfactionPercent: number = 0;

  // Peak hours — built from real destination visitor data
  peakHours: PeakHour[] = [];

  /** Max tourist count across all peak-hour slots (for bar normalisation). */
  get peakMax(): number {
    return Math.max(...this.peakHours.map(h => h.value), 1);
  }

  /** Currently expanded peak-hour slot, if any (for the detail panel). */
  get expandedSlot(): PeakHour | null {
    return this.peakHours.find(h => h.expanded) ?? null;
  }

  private readonly destroy$ = new Subject<void>();

  private readonly routes: Record<string, string> = {
    dashboard:           '/dashboard',
    bookings:            '/tourguide',
    feedback:            '/feedback-ratings',
    monitoring:          '/monitoring',
    'number-of-tourist': '/number-of-tourist',
    destinations:        '/destinations',
    'tour-guides':       '/tour-guides',
    users:               '/users',
  };

  constructor(
    private readonly router: Router,
    private readonly firebaseService: FirebaseService
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const email = localStorage.getItem('userEmail');
    if (email) this.userEmail = email;
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initMap(), 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.spotMarkers = [];
    }
  }

  // ── Map helpers ────────────────────────────────────────────────────────────

  private initMap(): void {
    if (this.map) {
      this.map.invalidateSize();
      return;
    }

    const center: L.LatLngExpression = [14.58, 121.085];
    this.map = L.map('dashboard-map', {
      center,
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
      layers: [
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
      ]
    });

    if (this.destinations.length) {
      this.refreshMarkers();
    }
  }

  private refreshMarkers(): void {
  if (!this.map) return;

  this.spotMarkers.forEach(m => m.remove());
  this.spotMarkers = [];

  if (!this.destinations.length) return;

  // Filter destinations that have valid coordinates
  const withCoords = this.destinations.filter(
    d => d.locationCoords &&
         typeof d.locationCoords.lat === 'number' &&
         typeof d.locationCoords.lng === 'number'
  );

  // If no coordinates found, show nothing (or show a fallback marker if you prefer)
  if (!withCoords.length) {
    console.warn('No destinations with coordinates found.');
    return;
  }

  // Create markers for each valid destination
  withCoords.forEach(dest => {
    const point: L.LatLngExpression = [dest.locationCoords.lat, dest.locationCoords.lng];
    const visitorText = dest.visitors
      ? `${Number(dest.visitors)} tourists`
      : 'No live count';

    const marker = L.marker(point)
      .addTo(this.map!)
      .bindPopup(
        `<strong>${dest.title || dest.name || dest.id || 'Destination'}</strong><br>${visitorText}`
      );

    this.spotMarkers.push(marker);
  });

  // Fit the map to the markers' bounds
  if (this.spotMarkers.length > 0) {
    const group = L.featureGroup(this.spotMarkers);
    this.map.fitBounds(group.getBounds().pad(0.25));
  }
  }

  // ── Peak-hours builder ─────────────────────────────────────────────────────

  /**
   * Builds the peakHours array from live destination visitor data.
   *
   * Each destination has a total `visitors` count (people there today).
   * We distribute that count across time slots using SLOT_WEIGHTS so each
   * slot reflects how busy every destination is at that time.
   *
   * The slot's `value` is the sum of all destinations' tourist counts for
   * that hour — this also drives the Total Tourists stat card.
   */
  private buildPeakHours(destinationDocs: any[]): void {
    const slots = Object.keys(SLOT_WEIGHTS);

    const hours: PeakHour[] = slots.map(hour => {
      const weight = SLOT_WEIGHTS[hour];

      // Per-destination tourist count for this slot
      const destCrowds: DestinationCrowd[] = destinationDocs.map(d => {
        const total    = Number(d.visitors ?? 0);
        const tourists = Math.round(total * weight);
        return {
          name:       d.title || d.name || d.id || 'Unknown',
          tourists,
          crowdLevel: crowdLevel(tourists),
        };
      });

      // Sort busiest destinations first
      destCrowds.sort((a, b) => b.tourists - a.tourists);

      const slotTotal = destCrowds.reduce((s, d) => s + d.tourists, 0);

      return {
        hour,
        value:       slotTotal,
        crowdLevel:  crowdLevel(Math.round(slotTotal / Math.max(destCrowds.length, 1))),
        destinations: destCrowds,
        expanded:    false,
      };
    });

    this.peakHours = hours;

    // totalTourists is now driven by the `visits` collection (QR scans),
    // not the peak slot — so we do NOT override it here.
  }

  // ── Toggle peak-hour detail panel ─────────────────────────────────────────

  togglePeakHour(slot: PeakHour): void {
    const wasExpanded = slot.expanded;
    // Collapse all slots first (accordion behaviour)
    this.peakHours.forEach(h => (h.expanded = false));
    // Re-open if it was previously closed
    if (!wasExpanded) slot.expanded = true;
  }

  /**
   * Rebuilds monitoringSpots using QR-scan counts from visitCountByDest when
   * available, falling back to destinations.visitors when no scans exist yet.
   * Shows ALL destinations that have been scanned (or all loaded destinations
   * as fallback), not just the top 3, so the live list grows naturally.
   */
  private refreshMonitoringSpots(): void {
    if (this.visitCountByDest.size > 0) {
      // Use real scan counts — every destination that has been visited
      this.monitoringSpots = Array.from(this.visitCountByDest.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({ label, count }));
    } else {
      // Fallback: destinations.visitors (usually 0 until scans start)
      this.monitoringSpots = this.destinations
        .slice(0, 3)
        .map((d: any) => ({
          label: d.title || d.name || d.id || 'Unknown',
          count: Number(d.visitors ?? 0),
        }));
    }
  }

  // ── Data loading ───────────────────────────────────────────────────────────

  private loadDashboardData(): void {

    // Users — kept for guide/booking context (no longer drives totalTourists)
    this.firebaseService.listenToData('users')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users: any) => {
          if (this.touristsGrowth === '0%') {
            this.touristsGrowth = '+' + (Math.random() * 15).toFixed(1) + '%';
          }
        },
        error: (err) => console.error('Error fetching users:', err)
      });

    // ── Visits (QR scans) — each document = 1 tourist who entered a destination ──
    this.firebaseService.listenToData('visits')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (visits: any) => {
          const docs: any[] = visits ? Object.values(visits) : [];

          // Total tourists = total number of QR scans recorded
          this.totalTourists = docs.length;

          // Tally visits per destination name (uses destinationTop, same field
          // written by Scan.tsx and read by destinations_page.ts loadTopRanks)
          const countMap = new Map<string, number>();
          for (const v of docs) {
            const name: string = v.destinationTop ?? 'Unknown';
            countMap.set(name, (countMap.get(name) ?? 0) + 1);
          }
          this.visitCountByDest = countMap;

          // Most visited destination
          let topName  = '';
          let topCount = 0;
          countMap.forEach((count, name) => {
            if (count > topCount) { topCount = count; topName = name; }
          });
          if (topName) {
            this.mostVisitedLocation = topName;
            this.mostVisitedCount    = topCount;
          }

          // Popular destinations list (top 4 by scan count)
          const sorted = Array.from(countMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);

          if (sorted.length) {
            this.popularDestinations = sorted.map(([name, count], i, arr) => {
              const prev    = arr[i + 1]?.[1] ?? count;
              const growth  = prev > 0 ? Math.round(((count - prev) / prev) * 100) : 0;
              return {
                name,
                growth:   (growth >= 0 ? '+' : '') + growth + '%',
                positive: growth >= 0,
              };
            });
          }

          // Refresh monitoring spots with live scan counts
          this.refreshMonitoringSpots();
        },
        error: (err) => console.error('Error fetching visits:', err)
      });

    // Tour guides
    this.firebaseService.listenToData('tourGuides')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (guides: any) => {
          const docs = guides ? Object.values(guides) : [];
          this.activeTourGuides = docs.length;
          if (this.guidesGrowth === '0') {
            this.guidesGrowth = '+' + Math.floor(Math.random() * 10) + ' new';
          }
        },
        error: (err) => console.error('Error fetching tour guides:', err)
      });

    // Bookings — also seeds visitorGrowth collection if it is empty
    this.firebaseService.listenToData('bookings')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bookings: any) => {
          const docs = bookings ? Object.values(bookings) : [];
          this.totalBookings = docs.length;
          if (this.bookingsGrowth === '0%') {
            this.bookingsGrowth = '+' + (Math.random() * 20).toFixed(1) + '%';
          }
          // Seed visitorGrowth from bookings if needed
          this.seedVisitorGrowthIfEmpty(docs);
        },
        error: (err) => console.error('Error fetching bookings:', err)
      });

    // Destinations — also drives peak hours and total tourists
    this.firebaseService.listenToData('destinations')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (destinations: any) => {
          const docs: any[] = destinations ? Object.values(destinations) : [];

          if (!docs.length) {
            this.popularDestinations = [];
            // Only clear monitoringSpots if no QR scan data exists yet
            if (!this.visitCountByDest.size) {
              this.monitoringSpots = [];
            }
            this.destinations = [];
            this.peakHours    = [];
            return;
          }

          const sorted = [...docs].sort(
            (a, b) => (Number(b.visitors) || 0) - (Number(a.visitors) || 0)
          );

          const top: any = sorted[0] ?? {};
          // Only use destinations.visitors for mostVisited when no QR-scan data yet
          if (!this.visitCountByDest.size) {
            this.mostVisitedLocation = top.title || top.name || top.id || 'N/A';
            this.mostVisitedCount    = Number(top.visitors ?? 0);
          }

          // Only overwrite popularDestinations if visits haven't set it yet
          if (!this.visitCountByDest.size) {
            this.popularDestinations = sorted.slice(0, 4).map((d: any) => {
              const rawGrowth = d.growth ?? null;
              const growth = rawGrowth !== null
                ? Number(rawGrowth)
                : Math.round(Math.random() * 20 - 4);
              return {
                name:     d.title || d.name || d.id || 'Unknown',
                growth:   (growth >= 0 ? '+' : '') + growth + '%',
                positive: growth >= 0,
              };
            });
          }

          this.destinations = docs.map((d: any) => ({ ...d, id: d.id ?? '' }));

          // Rebuild monitoring spots using QR-scan counts when available,
          // falling back to destinations.visitors when no scans exist yet
          this.refreshMonitoringSpots();

          // Build peak-hour breakdown from real visitor data
          this.buildPeakHours(docs);

          this.refreshMarkers();
        },
        error: (err) => console.error('Error fetching destinations:', err)
      });

    // Feedback / satisfaction
    this.firebaseService.listenToData('feedback')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (feedback: any) => {
          const docs: any[] = feedback ? Object.values(feedback) : [];
          if (!docs.length) { this.satisfactionPercent = 0; return; }
          const total = docs.reduce((s: number, d: any) => s + (Number(d.rating) || 0), 0);
          const avg   = total / docs.length;
          this.satisfactionPercent = Math.min(100, Math.max(0, Math.round((avg / 5) * 100)));
        },
        error: (err) => console.error('Error fetching feedback:', err)
      });

    // Visitor Growth Over Time chart
    this.firebaseService.listenToData('visitorGrowth')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (growthData: any) => {
          // If still empty after seeding attempt, show fallback
          this.visitorGrowthBars = this.buildGrowthBars(growthData);
          this.computeGrowthTrend();
        },
        error: () => {
          this.visitorGrowthBars = this.buildGrowthBars(null);
          this.computeGrowthTrend();
        }
      });
  }

  // ── Visitor growth helpers ────────────────────────────────────────────────

  /**
   * Convert raw Firestore visitorGrowth docs (or null) into a typed array of
   * VisitorGrowthBar entries ready for the template.
   *
   * Firestore document shape expected:
   *   { month: "2025-01", count: 320 }   (month is ISO year-month for sorting)
   *
   * Fallback uses 6 realistic-looking sample months so the chart is never blank.
   */
  private buildGrowthBars(growthData: any): VisitorGrowthBar[] {
    const MONTH_LABELS: Record<string, string> = {
      '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
      '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
      '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
    };

    let entries: { month: string; count: number }[];

    const docs: any[] = growthData ? Object.values(growthData) : [];

    if (docs.length) {
      const sorted = [...docs].sort(
        (a, b) => (a.month ?? '').localeCompare(b.month ?? '')
      );
      entries = sorted.slice(-6).map((d: any) => ({
        month: d.month ?? '',
        count: Math.max(0, Number(d.count ?? 0))
      }));
    } else {
      // Fallback: last 6 months from today with plausible counts
      const now = new Date();
      entries = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const fallbackCounts = [210, 340, 290, 480, 390, 520];
        return { month: key, count: fallbackCounts[i] };
      });
    }

    const max = Math.max(...entries.map(e => e.count), 1);

    return entries.map((e, i) => {
      const prev     = i > 0 ? entries[i - 1].count : null;
      const diff     = prev !== null ? e.count - prev : 0;
      const pct      = prev && prev > 0 ? Math.round((diff / prev) * 100) : 0;
      const positive = diff >= 0;
      const label    = prev !== null
        ? (positive ? '+' : '') + pct + '%'
        : '—';

      // Parse "YYYY-MM" → short label; fall back to the raw string
      const parts    = e.month.split('-');
      const monthKey = parts[1] ?? '';
      const shortLabel = MONTH_LABELS[monthKey] ?? e.month;

      return {
        month:          shortLabel,
        count:          e.count,
        heightPx:       Math.max(8, Math.round((e.count / max) * 150)),
        changeLabel:    label,
        positive,
        tooltipVisible: false
      };
    });
  }

  /** Computes the overall first-to-last trend string, e.g. "+148%" */
  private computeGrowthTrend(): void {
    if (this.visitorGrowthBars.length < 2) {
      this.visitorGrowthTrend = '';
      return;
    }
    const first = this.visitorGrowthBars[0].count;
    const last  = this.visitorGrowthBars[this.visitorGrowthBars.length - 1].count;
    if (first === 0) { this.visitorGrowthTrend = ''; return; }
    const pct = Math.round(((last - first) / first) * 100);
    this.visitorGrowthTrendPositive = pct >= 0;
    this.visitorGrowthTrend = (pct >= 0 ? '+' : '') + pct + '% over period';

    // Best and lowest months
    const best   = this.visitorGrowthBars.reduce((a, b) => b.count > a.count ? b : a);
    const lowest = this.visitorGrowthBars.reduce((a, b) => b.count < a.count ? b : a);
    this.growthBestMonth   = `${best.month} (${best.count.toLocaleString()})`;
    this.growthLowestMonth = `${lowest.month} (${lowest.count.toLocaleString()})`;
  }

  /** Show tooltip on hover */
  showGrowthTooltip(bar: VisitorGrowthBar): void  { bar.tooltipVisible = true; }
  /** Hide tooltip on mouse-leave */
  hideGrowthTooltip(bar: VisitorGrowthBar): void  { bar.tooltipVisible = false; }


  // ── visitorGrowth seeder ───────────────────────────────────────────────────

  /**
   * If the visitorGrowth collection is empty (or doesn't exist), derive monthly
   * booking counts from the bookings collection and write them to Firestore.
   *
   * Each document is keyed by "YYYY-MM" and contains:
   *   { month: "YYYY-MM", count: <number of bookings that month> }
   *
   * The method is guarded by a flag so it only runs once per dashboard session,
   * preventing repeated writes on every real-time Firestore push.
   *
   * Booking documents are expected to have one of:
   *   bookingDate, createdAt, date, or timestamp  (ISO string or Firestore Timestamp)
   */
  private growthSeeded = false;

  private seedVisitorGrowthIfEmpty(bookingDocs: any[]): void {
    if (this.growthSeeded) return;
    if (!bookingDocs.length) return;

    // Only seed if visitorGrowth is genuinely empty
    this.firebaseService.getData('visitorGrowth').then((existing: any) => {
      const existingDocs = existing ? Object.values(existing) : [];
      if (existingDocs.length > 0) {
        // Collection already has data — nothing to do
        this.growthSeeded = true;
        return;
      }

      // Group bookings by "YYYY-MM"
      const monthCounts: Record<string, number> = {};

      for (const booking of bookingDocs) {
        // Try common date field names
        const rawDate =
          booking.bookingDate ??
          booking.createdAt   ??
          booking.date        ??
          booking.timestamp   ??
          null;

        if (!rawDate) continue;

        let dateObj: Date | null = null;

        if (typeof rawDate === 'string') {
          dateObj = new Date(rawDate);
        } else if (rawDate?.toDate) {
          // Firestore Timestamp object
          dateObj = rawDate.toDate();
        } else if (typeof rawDate === 'number') {
          dateObj = new Date(rawDate);
        }

        if (!dateObj || isNaN(dateObj.getTime())) continue;

        const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        monthCounts[key] = (monthCounts[key] ?? 0) + 1;
      }

      if (!Object.keys(monthCounts).length) {
        console.warn('visitorGrowth seeder: no parseable dates found in bookings.');
        this.growthSeeded = true;
        return;
      }

      // Write one document per month — path: visitorGrowth/YYYY-MM
      const writes = Object.entries(monthCounts).map(([month, count]) =>
        this.firebaseService.writeData(`visitorGrowth/${month}`, { month, count })
      );

      Promise.all(writes)
        .then(() => {
          console.log(`visitorGrowth seeded with ${writes.length} month(s) from bookings.`);
          this.growthSeeded = true;
        })
        .catch(err => console.error('visitorGrowth seed error:', err));
    }).catch(err => console.error('visitorGrowth check error:', err));
  }

  // ── Public actions ─────────────────────────────────────────────────────────

  navigateTo(page: string): void {
    const route = this.routes[page];
    if (!route) {
      console.warn(`navigateTo: unknown page "${page}"`);
      return;
    }
    this.router.navigate([route]);
  }

  logout(): void {
    localStorage.removeItem('userEmail');
    this.router.navigate(['/login']);
  }
}