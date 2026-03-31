import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  Firestore
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

interface TourGuide {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface Destination {
  id: string;
  name: string;
}

interface ScannedTourist {
  id: string;
  name: string;
  email: string;
}

@Component({
  selector: 'app-tour-guide-management',
  templateUrl: './tour-guide-management.page.html',
  styleUrls: ['./tour-guide-management.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule]
})
export class TourGuideManagementPage implements OnInit {
  canCreate = true;
  canUpdate = true;
  canDelete = true;

  guides: TourGuide[] = [];
  allDestinations: Destination[] = [];  // global list for the assignment picker

  // UI states
  isLoading = false;
  isFetching = false;
  showGuideModal    = false;
  showScheduleModal = false;
  showAssignModal   = false;
  selectedGuide: TourGuide | null = null;
  errorMessage = '';

  // Add / edit guide form
  guideForm = {
    id: '',
    name: '',
    email: '',
    phone: '',
    status: 'active' as 'active' | 'inactive'
  };
  isEditing = false;

  // ── Assign-destinations state ──────────────────────────────────────────────
  // IDs already saved to Firestore for the selected guide
  assignedDestinationIds: string[] = [];
  // Working copy inside the modal (not yet committed)
  pendingDestinationIds: string[] = [];
  // Maps destinationId → guideDestinations doc id (needed for deletion)
  assignDocMap: Record<string, string> = {};

  // ── Schedule-tour state ───────────────────────────────────────────────────
  guideDestinations: Destination[] = [];
  scannedTourists: ScannedTourist[] = [];
  scheduleForm = {
    destinationId: '',
    tourDate: '',
    selectedTouristIds: [] as string[]
  };

  private db: Firestore;
  private readonly GUIDES_COLL           = 'tourGuides';
  private readonly DEST_COLL             = 'destinations';
  private readonly GUIDE_DEST_COLL       = 'guideDestinations';
  private readonly SCANNED_TOURISTS_COLL = 'scannedTourists';
  private readonly BOOKINGS_COLL         = 'bookings';

  constructor(private router: Router, private authService: AuthService) {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    this.db = getFirestore(app);
  }

  async ngOnInit() {
    this.setPermissions();
    await Promise.all([this.loadGuides(), this.loadAllDestinations()]);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private parseDate(value: any): string {
    if (!value) return '';
    if (typeof value?.toDate === 'function') return this.formatDate(value.toDate());
    if (typeof value === 'string' && value.includes('T')) {
      const d = new Date(value);
      return isNaN(d.getTime()) ? value : this.formatDate(d);
    }
    return typeof value === 'string' ? value : '';
  }

  private formatTourDate(dateString: string): string {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // ── Permissions ──────────────────────────────────────────────────────────

  setPermissions() {
    try {
      this.canCreate = this.authService.hasAccess({ table: 'tourGuides', action: 'create' }) !== false;
      this.canUpdate = this.authService.hasAccess({ table: 'tourGuides', action: 'update' }) !== false;
      this.canDelete = this.authService.hasAccess({ table: 'tourGuides', action: 'delete' }) !== false;
    } catch {
      this.canCreate = this.canUpdate = this.canDelete = true;
    }
  }

  // ── Data loaders ──────────────────────────────────────────────────────────

  async loadGuides() {
    this.isFetching = true;
    this.errorMessage = '';
    try {
      const snapshot = await getDocs(collection(this.db, this.GUIDES_COLL));
      this.guides = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data['name'] || '',
          email: data['email'] || '',
          phone: data['phone'] || '',
          status: data['status'] === 'inactive' ? 'inactive' : 'active',
          createdAt: this.parseDate(data['createdAt'])
        };
      });
    } catch (err) {
      console.error('Error loading guides:', err);
      this.errorMessage = 'Failed to load tour guides.';
    } finally {
      this.isFetching = false;
    }
  }

  /** Load every destination — used as the source list in the assign modal. */
  async loadAllDestinations() {
    try {
      const snapshot = await getDocs(collection(this.db, this.DEST_COLL));
      this.allDestinations = snapshot.docs.map(d => ({
        id: d.id,
        name: d.data()['title'] || d.data()['name'] || 'Unnamed'
      }));
    } catch (err) {
      console.error('Error loading destinations:', err);
    }
  }

  /**
   * Used when opening the Schedule modal — loads only the destinations already
   * assigned to the selected guide.
   */
  async loadGuideDestinations(guideId: string): Promise<void> {
    try {
      const q = query(
        collection(this.db, this.GUIDE_DEST_COLL),
        where('guideId', '==', guideId)
      );
      const snapshot = await getDocs(q);
      this.guideDestinations = snapshot.docs.map(d => ({
        id: d.data()['destinationId'] || d.id,
        name: d.data()['destinationName'] || d.data()['name'] || 'Unnamed'
      }));
    } catch (err) {
      console.error('Error loading guide destinations:', err);
      this.guideDestinations = [];
    }
  }

  async loadScannedTourists(guideId: string): Promise<void> {
    try {
      const q = query(
        collection(this.db, this.SCANNED_TOURISTS_COLL),
        where('guideId', '==', guideId)
      );
      const snapshot = await getDocs(q);
      this.scannedTourists = snapshot.docs.map(d => ({
        id: d.data()['touristId'] || d.id,
        name: d.data()['name'] || '',
        email: d.data()['email'] || ''
      }));
    } catch (err) {
      console.error('Error loading scanned tourists:', err);
      this.scannedTourists = [];
    }
  }

  // ── Guide CRUD ────────────────────────────────────────────────────────────

  openAddGuideModal() {
    this.isEditing = false;
    this.guideForm = { id: '', name: '', email: '', phone: '', status: 'active' };
    this.errorMessage = '';
    this.showGuideModal = true;
  }

  openEditGuideModal(guide: TourGuide) {
    this.isEditing = true;
    this.guideForm = {
      id: guide.id, name: guide.name,
      email: guide.email, phone: guide.phone, status: guide.status
    };
    this.showGuideModal = true;
  }

  async saveGuide() {
    if (!this.guideForm.name.trim()) {
      this.errorMessage = 'Name is required.';
      return;
    }
    this.isLoading = true;
    try {
      if (this.isEditing) {
        const docRef = doc(this.db, this.GUIDES_COLL, this.guideForm.id);
        await updateDoc(docRef, {
          name: this.guideForm.name,
          email: this.guideForm.email,
          phone: this.guideForm.phone,
          status: this.guideForm.status
        });
        const idx = this.guides.findIndex(g => g.id === this.guideForm.id);
        if (idx !== -1) this.guides[idx] = { ...this.guides[idx], ...this.guideForm };
      } else {
        const docRef = await addDoc(collection(this.db, this.GUIDES_COLL), {
          name: this.guideForm.name,
          email: this.guideForm.email,
          phone: this.guideForm.phone,
          status: this.guideForm.status,
          createdAt: new Date().toISOString()
        });
        this.guides.unshift({
          id: docRef.id,
          name: this.guideForm.name,
          email: this.guideForm.email,
          phone: this.guideForm.phone,
          status: this.guideForm.status,
          createdAt: this.formatDate(new Date())
        });
      }
      this.closeGuideModal();
    } catch (err) {
      console.error('Error saving guide:', err);
      this.errorMessage = 'Failed to save. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  async deleteGuide(guide: TourGuide) {
    if (!confirm(`Delete ${guide.name}?`)) return;
    this.isLoading = true;
    try {
      await deleteDoc(doc(this.db, this.GUIDES_COLL, guide.id));
      this.guides = this.guides.filter(g => g.id !== guide.id);
    } catch (err) {
      console.error('Error deleting guide:', err);
      this.errorMessage = 'Failed to delete.';
    } finally {
      this.isLoading = false;
    }
  }

  closeGuideModal() {
    this.showGuideModal = false;
    this.errorMessage = '';
  }

  // ── Assign-Destinations Modal ─────────────────────────────────────────────

  /**
   * Opens the "Assign Destinations" modal for a guide.
   * Loads current assignments from Firestore and pre-checks them.
   */
  async openAssignModal(guide: TourGuide) {
    this.selectedGuide = guide;
    this.assignedDestinationIds = [];
    this.pendingDestinationIds  = [];
    this.assignDocMap           = {};
    this.showAssignModal        = true;

    try {
      const q = query(
        collection(this.db, this.GUIDE_DEST_COLL),
        where('guideId', '==', guide.id)
      );
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(d => {
        const destId = d.data()['destinationId'];
        if (destId) {
          this.assignedDestinationIds.push(destId);
          this.assignDocMap[destId] = d.id;
        }
      });
      // Seed the working copy with what's already saved
      this.pendingDestinationIds = [...this.assignedDestinationIds];
    } catch (err) {
      console.error('Error loading assignments:', err);
    }
  }

  isDestinationAssigned(destId: string): boolean {
    return this.pendingDestinationIds.includes(destId);
  }

  toggleDestinationAssignment(destId: string) {
    const idx = this.pendingDestinationIds.indexOf(destId);
    if (idx === -1) {
      this.pendingDestinationIds.push(destId);
    } else {
      this.pendingDestinationIds.splice(idx, 1);
    }
  }

  /**
   * Diffs pendingDestinationIds vs assignedDestinationIds and writes only the
   * delta to Firestore (adds new, removes unassigned).
   */
  async saveAssignments() {
    if (!this.selectedGuide) return;
    this.isLoading = true;

    try {
      const guideId = this.selectedGuide.id;
      const toAdd    = this.pendingDestinationIds.filter(id => !this.assignedDestinationIds.includes(id));
      const toRemove = this.assignedDestinationIds.filter(id => !this.pendingDestinationIds.includes(id));

      for (const destId of toAdd) {
        const dest = this.allDestinations.find(d => d.id === destId);
        const newDoc = await addDoc(collection(this.db, this.GUIDE_DEST_COLL), {
          guideId,
          destinationId:   destId,
          destinationName: dest?.name || 'Unnamed',
          assignedAt:      new Date().toISOString()
        });
        this.assignDocMap[destId] = newDoc.id;
      }

      for (const destId of toRemove) {
        const docId = this.assignDocMap[destId];
        if (docId) {
          await deleteDoc(doc(this.db, this.GUIDE_DEST_COLL, docId));
          delete this.assignDocMap[destId];
        }
      }

      this.assignedDestinationIds = [...this.pendingDestinationIds];
      alert(`Destinations updated for ${this.selectedGuide.name}`);
      this.closeAssignModal();
    } catch (err) {
      console.error('Error saving assignments:', err);
      alert('Failed to save assignments. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  closeAssignModal() {
    this.showAssignModal = false;
    this.selectedGuide   = null;
    this.assignedDestinationIds = [];
    this.pendingDestinationIds  = [];
    this.assignDocMap           = {};
  }

  // ── Schedule-Tour Modal ───────────────────────────────────────────────────

  async openScheduleModal(guide: TourGuide) {
    this.selectedGuide  = guide;
    this.scheduleForm   = { destinationId: '', tourDate: '', selectedTouristIds: [] };
    this.guideDestinations = [];
    this.scannedTourists   = [];
    this.showScheduleModal = true;
    await Promise.all([
      this.loadGuideDestinations(guide.id),
      this.loadScannedTourists(guide.id)
    ]);
  }

  toggleTouristSelection(touristId: string) {
    const idx = this.scheduleForm.selectedTouristIds.indexOf(touristId);
    if (idx === -1) {
      this.scheduleForm.selectedTouristIds.push(touristId);
    } else {
      this.scheduleForm.selectedTouristIds.splice(idx, 1);
    }
  }

  isTouristSelected(touristId: string): boolean {
    return this.scheduleForm.selectedTouristIds.includes(touristId);
  }

  selectAllTourists() {
    this.scheduleForm.selectedTouristIds = this.scannedTourists.map(t => t.id);
  }

  clearTouristSelection() {
    this.scheduleForm.selectedTouristIds = [];
  }

  get allTouristsSelected(): boolean {
    return this.scannedTourists.length > 0 &&
      this.scheduleForm.selectedTouristIds.length === this.scannedTourists.length;
  }

  async scheduleTour() {
    if (!this.selectedGuide) return;
    if (!this.scheduleForm.destinationId) { alert('Please select a destination'); return; }
    if (!this.scheduleForm.tourDate)       { alert('Please select a tour date');   return; }
    if (this.scheduleForm.selectedTouristIds.length === 0) {
      alert('Please select at least one tourist'); return;
    }

    const selectedTourists = this.scannedTourists.filter(t =>
      this.scheduleForm.selectedTouristIds.includes(t.id)
    );
    const destination = this.guideDestinations.find(d => d.id === this.scheduleForm.destinationId);

    const bookingData = {
      touristName:   selectedTourists[0]?.name  || '',
      email:         selectedTourists[0]?.email || '',
      guideName:     this.selectedGuide.name,
      guideId:       this.selectedGuide.id,
      destination:   destination?.name || 'Unknown',
      destinationId: this.scheduleForm.destinationId,
      tourDate:      this.formatTourDate(this.scheduleForm.tourDate),
      tourists:      selectedTourists.length,
      status:        'On-going' as const,
      touristList:   selectedTourists,
      createdAt:     new Date().toISOString()
    };

    this.isLoading = true;
    try {
      await addDoc(collection(this.db, this.BOOKINGS_COLL), bookingData);
      alert('Tour scheduled successfully!');
      this.closeScheduleModal();
    } catch (err) {
      console.error('Error scheduling tour:', err);
      alert('Failed to schedule tour. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  closeScheduleModal() {
    this.showScheduleModal = false;
    this.selectedGuide     = null;
    this.guideDestinations = [];
    this.scannedTourists   = [];
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  navigateTo(page: string) {
    const routes: { [key: string]: string } = {
      dashboard:           '/dashboard',
      bookings:            '/tourguide',
      feedback:            '/feedback-ratings',
      monitoring:          '/monitoring',
      'number-of-tourist': '/number-of-tourist',
      destinations:        '/destinations',
      'tour-guides':       '/tour-guides',
      users:               '/users',
    };
    if (!routes[page]) {
      console.warn(`navigateTo: unknown page "${page}"`);
      return;
    }
    this.router.navigate([routes[page]]);
  }

  logout() {
    this.authService.logout();
  }
}