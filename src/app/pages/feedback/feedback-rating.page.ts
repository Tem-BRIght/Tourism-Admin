import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';

// Firebase imports
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  collectionGroup,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  Firestore,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDS9QJtZBmMBbBZb6Sowxvc-PYEtlHe3LU',
  authDomain: 'seeways-be14b.firebaseapp.com',
  databaseURL: 'https://seeways-be14b-default-rtdb.firebaseio.com',
  projectId: 'seeways-be14b',
  storageBucket: 'seeways-be14b.firebasestorage.app',
  messagingSenderId: '53598789861',
  appId: '1:53598789861:web:bcae5bc7423a56de49b40c',
  measurementId: 'G-KZT8FJM8LD'
};

// ── Interfaces ────────────────────────────────────────────────────────────────

/** Shape of a review document at destinations/{destId}/reviews/{userId} */
interface Feedback {
  id: string;             // Firestore doc id (= userId)
  /** Path used for deletion: destinations/{destId}/reviews/{id} */
  destId: string;
  name: string;           // authorName or 'Anonymous'
  destination: string;    // destination name resolved from parent doc
  rating: number;
  comment: string;        // review text (+ feeling as subtitle)
  feeling: string;
  date: string;
  companion?: string;
  duration?: string;
  visitDate?: string;
  photos?: string[];
}

interface PopularSpot {
  rank: number;
  name: string;
  rating: number;
  reviews: number;
  satisfaction: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-feedback-ratings',
  templateUrl: './feedback-rating.page.html',
  styleUrls: ['./feedback-rating.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule]
})
export class FeedbackRatingsPage implements OnInit {

  // Permission flags
  canReadFeedback: boolean  = false;
  canDeleteFeedback: boolean = false;

  // UI states
  isLoading: boolean        = false;
  isFetching: boolean       = false;
  showFeedbackModal: boolean = false;
  selectedFeedback: Feedback | null = null;
  errorMessage: string      = '';

  // Filters
  filterDestination: string = '';
  filterRating: string      = '';

  // Pagination
  currentPage: number   = 1;
  itemsPerPage: number  = 10;
  totalItems: number    = 0;

  // Summary statistics
  overallRating: number           = 0;
  totalReviews: number            = 0;
  topRatedDestination: string     = '—';
  topRatedScore: number           = 0;
  mostReviewedSpot: string        = '—';
  mostReviewedCount: number       = 0;
  satisfactionRate: number        = 0;
  satisfactionGrowth: number      = 0;

  // Firestore
  private db: Firestore;

  // Data arrays
  popularSpots: PopularSpot[]  = [];
  reviews: Feedback[]          = [];
  filteredReviews: Feedback[]  = [];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    this.db   = getFirestore(app);
  }

  async ngOnInit() {
    this.setPermissions();
    await this.loadFeedback();
  }

  // ── Date helpers ──────────────────────────────────────────────────────────

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  private parseFirestoreDate(value: any): string {
    if (!value) return '';
    if (typeof value?.toDate === 'function') return this.formatDate(value.toDate());
    if (typeof value === 'string' && value.includes('T')) {
      const d = new Date(value);
      return isNaN(d.getTime()) ? value : this.formatDate(d);
    }
    if (typeof value === 'string') return value;
    return '';
  }

  // ── Firestore load ────────────────────────────────────────────────────────
  /**
   * Strategy:
   *  1. Fetch all destination docs to build an id → name map.
   *  2. Use collectionGroup('reviews') to pull every review across all destinations
   *     in a single query (requires a Firestore composite index on reviews/createdAt).
   *  3. Enrich each review with the parent destination name from the map.
   *
   * Firestore path: destinations/{destId}/reviews/{userId}
   *
   * Review fields written by WriteReviewModal:
   *   authorName, anonymous, overallRating, feeling, review (text),
   *   visitDate, companion, duration, photos[], createdAt (serverTimestamp)
   */
  async loadFeedback() {
    this.isFetching  = true;
    this.errorMessage = '';

    try {
      // ── Step 1: build destination name map ───────────────────────────────
      const destSnap = await getDocs(collection(this.db, 'destinations'));
      const destNames: Record<string, string> = {};
      destSnap.docs.forEach(d => {
        const data = d.data();
        destNames[d.id] = data['name'] || data['title'] || d.id;
      });

      // ── Step 2: fetch all reviews via collectionGroup ────────────────────
      // collectionGroup requires a Firestore index on the 'reviews' collection
      // with the field 'createdAt' ordered descending.
      let reviewDocs: QueryDocumentSnapshot<DocumentData>[] = [];
      try {
        const grpSnap = await getDocs(
          query(collectionGroup(this.db, 'reviews'), orderBy('createdAt', 'desc'))
        );
        reviewDocs = grpSnap.docs;
      } catch (indexErr: any) {
        // Index may not exist yet — fall back to per-destination reads
        console.warn('[feedback-rating] collectionGroup index missing, falling back to per-destination reads:', indexErr?.message);
        for (const destDoc of destSnap.docs) {
          const subSnap = await getDocs(
            query(
              collection(this.db, 'destinations', destDoc.id, 'reviews'),
              orderBy('createdAt', 'desc')
            )
          );
          reviewDocs.push(...subSnap.docs);
        }
      }

      // ── Step 3: map docs → Feedback objects ─────────────────────────────
      this.reviews = reviewDocs.map(d => {
        const data = d.data() as any;

        // Parent path: destinations/{destId}/reviews/{reviewId}
        // ref.parent.parent.id gives the destination doc id
        const destId   = (d.ref.parent?.parent?.id) ?? '';
        const destName = destNames[destId] || destId || 'Unknown Destination';

        const isAnon   = !!data['anonymous'];
        const rating   = typeof data['overallRating'] === 'number'
          ? data['overallRating']
          : parseFloat(data['overallRating']) || 0;

        return {
          id:          d.id,
          destId,
          name:        isAnon ? 'Anonymous' : (data['authorName'] || 'Traveller'),
          destination: destName,
          rating,
          comment:     data['review'] || data['comment'] || data['feedback'] || '',
          feeling:     data['feeling'] || '',
          date:        this.parseFirestoreDate(data['createdAt'] || data['date']),
          companion:   data['companion']  || '',
          duration:    data['duration']   || '',
          visitDate:   data['visitDate']  || '',
          photos:      Array.isArray(data['photos']) ? data['photos'] : [],
        } as Feedback;
      });

      this.applyFilters();
      this.computeStats();
    } catch (err: any) {
      console.error('[feedback-rating] Error loading feedback:', err);
      this.errorMessage = 'Failed to load feedback. Please try again.';
    } finally {
      this.isFetching = false;
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  private computeStats() {
    const all = this.reviews;
    this.totalReviews = all.length;

    if (all.length === 0) {
      this.overallRating      = 0;
      this.satisfactionRate   = 0;
      this.topRatedDestination = '—';
      this.topRatedScore      = 0;
      this.mostReviewedSpot   = '—';
      this.mostReviewedCount  = 0;
      this.popularSpots       = [];
      return;
    }

    // Overall average rating
    const ratingSum       = all.reduce((acc, f) => acc + f.rating, 0);
    this.overallRating    = Math.round((ratingSum / all.length) * 10) / 10;

    // Satisfaction: % with rating >= 4
    const satisfied       = all.filter(f => f.rating >= 4).length;
    this.satisfactionRate = Math.round((satisfied / all.length) * 100);

    // Group by destination
    const destMap: Record<string, { ratings: number[]; count: number }> = {};
    for (const f of all) {
      if (!destMap[f.destination]) destMap[f.destination] = { ratings: [], count: 0 };
      destMap[f.destination].ratings.push(f.rating);
      destMap[f.destination].count++;
    }

    const spots = Object.entries(destMap).map(([name, data]) => {
      const avg = data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length;
      const sat = Math.round((data.ratings.filter(r => r >= 4).length / data.ratings.length) * 100);
      return { name, avgRating: Math.round(avg * 10) / 10, count: data.count, satisfaction: sat };
    });

    spots.sort((a, b) => b.avgRating - a.avgRating);

    this.popularSpots = spots.slice(0, 5).map((s, i) => ({
      rank:         i + 1,
      name:         s.name,
      rating:       s.avgRating,
      reviews:      s.count,
      satisfaction: s.satisfaction,
    }));

    if (spots.length > 0) {
      this.topRatedDestination = spots[0].name;
      this.topRatedScore       = spots[0].avgRating;
    }

    const mostReviewed = [...spots].sort((a, b) => b.count - a.count)[0];
    if (mostReviewed) {
      this.mostReviewedSpot  = mostReviewed.name;
      this.mostReviewedCount = mostReviewed.count;
    }
  }

  // ── Permissions ───────────────────────────────────────────────────────────

  setPermissions() {
    try {
      this.canReadFeedback   = this.authService.hasAccess({ table: 'feedback', action: 'read' }) !== false;
      this.canDeleteFeedback = this.authService.isSuperAdmin();
    } catch {
      this.canReadFeedback   = true;
      this.canDeleteFeedback = false;
    }
  }

  // ── Feedback CRUD ─────────────────────────────────────────────────────────

  viewFeedback(feedback: Feedback) {
    if (this.canReadFeedback) {
      this.selectedFeedback  = feedback;
      this.showFeedbackModal = true;
    }
  }

  closeModal() {
    this.showFeedbackModal = false;
    this.selectedFeedback  = null;
  }

  /**
   * Delete a review from the correct subcollection path:
   *   destinations/{destId}/reviews/{reviewId}
   */
  async deleteFeedback(feedbackId: string | undefined) {
    if (!feedbackId) return;

    // Find the feedback to get its destId
    const fb = this.reviews.find(r => r.id === feedbackId) ?? this.selectedFeedback;
    if (!fb?.destId) {
      this.errorMessage = 'Cannot determine destination for this review.';
      return;
    }

    if (this.canDeleteFeedback && confirm('Are you sure you want to delete this feedback?')) {
      this.isLoading    = true;
      this.errorMessage = '';
      try {
        // Correct path: destinations/{destId}/reviews/{reviewId}
        await deleteDoc(doc(this.db, 'destinations', fb.destId, 'reviews', feedbackId));
        this.reviews = this.reviews.filter(f => f.id !== feedbackId);
        this.applyFilters();
        this.computeStats();
        this.closeModal();
      } catch (err: any) {
        console.error('[feedback-rating] Error deleting feedback:', err);
        this.errorMessage = 'Failed to delete feedback. Please try again.';
      } finally {
        this.isLoading = false;
      }
    }
  }

  // ── Filters ───────────────────────────────────────────────────────────────

  applyFilters() {
    let filtered = [...this.reviews];

    if (this.filterDestination?.trim()) {
      const term = this.filterDestination.toLowerCase().trim();
      filtered   = filtered.filter(f => f.destination.toLowerCase().includes(term));
    }

    if (this.filterRating) {
      const min = parseFloat(this.filterRating);
      if (!isNaN(min)) filtered = filtered.filter(f => f.rating >= min);
    }

    this.filteredReviews = filtered;
    this.totalItems      = filtered.length;
    this.currentPage     = 1;
  }

  resetFilters() {
    this.filterDestination = '';
    this.filterRating      = '';
    this.filteredReviews   = [...this.reviews];
    this.totalItems        = this.reviews.length;
    this.currentPage       = 1;
  }

  // ── Export ────────────────────────────────────────────────────────────────

  exportData() {
    if (this.canReadFeedback) this.generateCSV();
  }

  generateCSV() {
    const headers = ['ID', 'Tourist', 'Destination', 'Date', 'Rating', 'Feeling', 'Comment', 'Companion', 'Duration', 'Visit Date'];
    const rows    = this.reviews.map(f => [
      f.id, f.name, f.destination, f.date, f.rating,
      `"${(f.feeling  || '').replace(/"/g, '""')}"`,
      `"${(f.comment  || '').replace(/"/g, '""')}"`,
      f.companion  || '',
      f.duration   || '',
      f.visitDate  || '',
    ].join(','));
    rows.unshift(headers.join(','));

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url  = window.URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `feedback_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  changePage(page: number)  { this.currentPage = page; }

  nextPage() {
    if (this.currentPage < this.totalPages) this.changePage(this.currentPage + 1);
  }

  previousPage() {
    if (this.currentPage > 1) this.changePage(this.currentPage - 1);
  }

  get totalPages(): number { return Math.ceil(this.totalItems / this.itemsPerPage); }

  getPageArray(): number[] {
    const pages: number[] = [];
    const max   = 5;
    let start   = Math.max(1, this.currentPage - Math.floor(max / 2));
    let end     = Math.min(this.totalPages, start + max - 1);
    if (end - start + 1 < max) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  get paginatedReviews(): Feedback[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredReviews.slice(start, start + this.itemsPerPage);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  navigateTo(page: string) {
    const routes: Record<string, string> = {
      dashboard:            '/dashboard',
      bookings:             '/tourguide',
      feedback:             '/feedback-ratings',
      monitoring:           '/monitoring',
      'number-of-tourist':  '/number-of-tourist',
      destinations:         '/destinations',
      'tour-guides':        '/tour-guides',
      users:                '/users',
    };
    if (!routes[page]) {
      console.warn(`navigateTo: unknown page "${page}"`);
      return;
    }
    this.router.navigate([routes[page]]);
  }

  logout() { this.authService.logout(); }
}