import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
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
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
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

interface DestinationContent {
  id: string;
  title: string;
  imageUrl: string;
  imageFile?: File;
  shortDescription: string;
  fullDescription: string;
  location: string;
  hours: string;
  entranceFee: string;
  goodFor: string[];
  parking: string;
  contactNumber: string;
  website: string;
  createdAt: string;
  updatedAt: string;
  status: 'published' | 'draft';
  tempStatus?: 'Temporarily Closed' | null;
  closeReason?: string;
  closedAt?: string;
  locationCoords?: { lat: number; lng: number } | null;
  qrUrl?: string;
}

@Component({
  selector: 'app-destinations',
  templateUrl: './destinations.page.html',
  styleUrls: ['./destinations.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule]
})
export class DestinationsPage implements OnInit {

  // Permission flags
  canCreate: boolean = false;
  canUpdate: boolean = false;
  canDelete: boolean = false;

  // UI states
  isLoading: boolean = false;
  isFetching: boolean = false;
  showContentModal: boolean = false;
  showDeleteConfirm: boolean = false;
  selectedContent: DestinationContent | null = null;
  isEditing: boolean = false;
  errorMessage: string = '';
  qrCodeDataUrl: string = '';

  // Temp close state
  showTempCloseModal: boolean = false;
  tempCloseTarget: DestinationContent | null = null;
  tempCloseReason: string = '';

  // Top destinations rank (title → rank 1-5)
  topRankMap: Map<string, number> = new Map();

  // Filters
  searchTerm: string = '';

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;

  // Firestore
  private db: Firestore;
  private readonly COLLECTION = 'destinations';
  // Leaflet map instances
  private addMap: any = null;
  private addMarker: any = null;
  private editMap: any = null;
  private editMarker: any = null;

  // Options
  goodForOptions: string[] = [
    'Adventure', 'Family', 'Romantic', 'Friends', 'Solo',
    'Culture', 'Nature', 'Relaxation', 'Food', 'Shopping',
    'History', 'Education', 'Photography', 'Wellness'
  ];

  parkingOptions: string[] = [
    'Available', 'Limited', 'Street Parking', 'Paid Parking', 'Valet', 'None'
  ];

  statusOptions: string[] = ['published', 'draft'];

  // Form data
  contentForm: any = this.emptyForm();

  // Data
  contents: DestinationContent[] = [];
  filteredContents: DestinationContent[] = [];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    // Init Firebase once (guard against hot-reload double-init)
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    this.db = getFirestore(app);
  }

  async ngOnInit() {
    this.setPermissions();
    await this.loadDestinations();
    await this.loadTopRanks();
  }

  // ============= TOP RANKS (auto from visits) =============

  async loadTopRanks() {
    try {
      const snapshot = await getDocs(collection(this.db, 'visits'));
      const countMap = new Map<string, number>();

      snapshot.docs.forEach(d => {
        const title = (d.data() as any)['destinationTop'];
        if (title) {
          countMap.set(title, (countMap.get(title) ?? 0) + 1);
        }
      });

      // Sort by visit count descending, take top 5
      const sorted = Array.from(countMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      this.topRankMap = new Map(sorted.map(([title], index) => [title, index + 1]));
    } catch (err) {
      console.error('Error loading visit ranks:', err);
    }
  }

  getRank(title: string): number | null {
    return this.topRankMap.get(title) ?? null;
  }

  // ============= FIRESTORE =============

  private emptyForm() {
    return {
      title: '',
      imageUrl: '',
      imageFile: undefined as File | undefined,
      shortDescription: '',
      fullDescription: '',
      location: '',
      locationCoords: null as { lat: number; lng: number } | null,
      hours: '',
      entranceFee: '',
      goodFor: [] as string[],
      parking: 'Available',
      contactNumber: '',
      website: '',
      status: 'published'
    };
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  // Handle Firestore Timestamp objects, ISO strings, and plain strings
  private parseFirestoreDate(value: any): string {
    if (!value) return '';
    // Firestore Timestamp has a toDate() method
    if (typeof value?.toDate === 'function') {
      return this.formatDate(value.toDate());
    }
    // ISO string (e.g. 2026-03-17T00:56:50.144Z)
    if (typeof value === 'string' && value.includes('T')) {
      const d = new Date(value);
      return isNaN(d.getTime()) ? value : this.formatDate(d);
    }
    // Already a plain readable string
    if (typeof value === 'string') return value;
    return '';
  }

  // ============= MAP (LEAFLET) — matches monitor-activity pattern =============

  private initAddMap() {
    this.destroyAddMap();
    setTimeout(() => {
      const el = document.getElementById('osm-map');
      if (!el) return;

      const defaultLat = this.contentForm.locationCoords?.lat ?? 14.58;
      const defaultLng = this.contentForm.locationCoords?.lng ?? 121.085;

      this.addMap = L.map(el, { center: [defaultLat, defaultLng], zoom: 15, attributionControl: false });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.addMap);

      // Restore marker if editing an existing record
      if (this.contentForm.locationCoords) {
        this.addMarker = L.marker([this.contentForm.locationCoords.lat, this.contentForm.locationCoords.lng])
          .addTo(this.addMap);
      }

      this.addMap.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        this.contentForm.locationCoords = { lat, lng };
        if (this.addMarker) {
          this.addMarker.setLatLng([lat, lng]);
        } else {
          this.addMarker = L.marker([lat, lng]).addTo(this.addMap!);
        }
      });
    }, 150);
  }

  private destroyAddMap() {
    if (this.addMap) {
      this.addMap.remove();
      this.addMap = null;
      this.addMarker = null;
    }
  }

  private initEditMap() {
    this.destroyEditMap();
    setTimeout(() => {
      const el = document.getElementById('osm-map-edit');
      if (!el) return;

      const defaultLat = this.contentForm.locationCoords?.lat ?? 14.58;
      const defaultLng = this.contentForm.locationCoords?.lng ?? 121.085;

      this.editMap = L.map(el, { center: [defaultLat, defaultLng], zoom: 15, attributionControl: false });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.editMap);

      if (this.contentForm.locationCoords) {
        this.editMarker = L.marker([this.contentForm.locationCoords.lat, this.contentForm.locationCoords.lng])
          .addTo(this.editMap);
      }

      this.editMap.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        this.contentForm.locationCoords = { lat, lng };
        if (this.editMarker) {
          this.editMarker.setLatLng([lat, lng]);
        } else {
          this.editMarker = L.marker([lat, lng]).addTo(this.editMap!);
        }
      });
    }, 150);
  }

  private destroyEditMap() {
    if (this.editMap) {
      this.editMap.remove();
      this.editMap = null;
      this.editMarker = null;
    }
  }

    async loadDestinations() {
    this.isFetching = true;
    this.errorMessage = '';
    try {
      const q = query(
        collection(this.db, this.COLLECTION),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      this.contents = snapshot.docs.map(d => {
        const data = d.data() as any;
        return {
          id: d.id,
          title: data.title || data.name || '',
          imageUrl: data.imageUrl || 'assets/placeholder.jpg',
          shortDescription: data.shortDescription || '',
          fullDescription: data.fullDescription || '',
          // Guard: location may be a Firestore GeoPoint — coerce to string
          locationCoords: data.locationCoords || null,
          location: typeof data.location === 'string'
            ? data.location
            : (data.location?.address || data.location?.name || ''),
          hours: data.hours || '',
          entranceFee: data.entranceFee || '',
          goodFor: Array.isArray(data.goodFor) ? data.goodFor : [],
          parking: data.parking || 'Available',
          contactNumber: data.contactNumber || '',
          website: data.website || '',
          createdAt: this.parseFirestoreDate(data.createdAt),
          updatedAt: this.parseFirestoreDate(data.updatedAt),
          status: data.status === 'draft' ? 'draft' : 'published',
          tempStatus: data.tempStatus === 'Temporarily Closed' ? 'Temporarily Closed' : null,
          closeReason: data.closeReason || ''
        } as DestinationContent;
      });
      this.applyFilters();
    } catch (err: any) {
      console.error('Error loading destinations:', err);
      this.errorMessage = 'Failed to load destinations. Please try again.';
    } finally {
      this.isFetching = false;
    }
  }

  // ============= PERMISSION FUNCTIONS =============
  setPermissions() {
    try {
      // Fall back to true if hasAccess returns falsy (not yet configured)
      this.canCreate = this.authService.hasAccess({ table: 'destinations', action: 'create' }) !== false;
      this.canUpdate = this.authService.hasAccess({ table: 'destinations', action: 'update' }) !== false;
      this.canDelete = this.authService.hasAccess({ table: 'destinations', action: 'delete' }) !== false;
    } catch {
      this.canCreate = true;
      this.canUpdate = true;
      this.canDelete = true;
    }
  }

  // ============= FILTER FUNCTIONS =============
  applyFilters() {
    let filtered = [...this.contents];
    if (this.searchTerm?.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(c =>
        c.title?.toLowerCase().includes(term) ||
        c.shortDescription?.toLowerCase().includes(term) ||
        c.fullDescription?.toLowerCase().includes(term) ||
        c.location?.toLowerCase().includes(term)
      );
    }
    this.filteredContents = filtered;
    this.totalItems = filtered.length;
    this.currentPage = 1;
  }

  resetFilters() {
    this.searchTerm = '';
    this.filteredContents = [...this.contents];
    this.totalItems = this.contents.length;
    this.currentPage = 1;
  }

  // ============= IMAGE HANDLING =============
  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    this.contentForm.imageFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => { this.contentForm.imageUrl = e.target.result; };
    reader.readAsDataURL(file);
  }

  removeImage() {
    this.contentForm.imageUrl = '';
    this.contentForm.imageFile = undefined;
  }

  // ============= CHECKBOX HANDLERS =============
  toggleGoodFor(option: string) {
    if (!this.contentForm.goodFor) this.contentForm.goodFor = [];
    const idx = this.contentForm.goodFor.indexOf(option);
    if (idx === -1) {
      this.contentForm.goodFor.push(option);
    } else {
      this.contentForm.goodFor.splice(idx, 1);
    }
  }

  // ============= CONTENT MANAGEMENT =============
  openCreateModal() {
    this.isEditing = false;
    this.selectedContent = null;
    this.contentForm = this.emptyForm();
    this.errorMessage = '';
    this.showContentModal = true;
    setTimeout(() => this.initAddMap(), 0);
  }

  openEditModal(content: DestinationContent) {
    this.isEditing = true;
    this.selectedContent = content;
    this.contentForm = {
      ...content,
      goodFor: [...(content.goodFor || [])],
      locationCoords: content.locationCoords ?? null
    };
    this.errorMessage = '';
    this.showContentModal = true;
    setTimeout(() => this.initEditMap(), 0);
  }

  viewContent(content: DestinationContent) {
    this.selectedContent = content;
    this.isEditing = false;
    this.showContentModal = true;
    this.qrCodeDataUrl = '';
    // Generate QR after view is rendered
    setTimeout(() => this.generateQrCode(content), 100);
  }

  // ============= QR CODE =============

  async generateQrCode(content: DestinationContent) {
    try {
      // Deep-link URL tourists scan to view this destination in the app
      const url = `${window.location.origin}/destination?id=${content.id}`;

      // Use qrcode npm package (loaded via dynamic import or CDN)
      const QRCode = await this.loadQrLib();
      if (!QRCode) return;

      const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
      if (!canvas) return;

      // qrcode package API: QRCode.toCanvas(canvas, text, opts)
      await QRCode.toCanvas(canvas, url, {
        width: 180,
        margin: 2,
        color: { dark: '#2c3e50', light: '#ffffff' }
      });

      this.qrCodeDataUrl = canvas.toDataURL('image/png');
    } catch (err) {
      console.error('QR generation error:', err);
    }
  }

  private loadQrLib(): Promise<any> {
    // Pure CDN — no npm install needed, avoids TS2307
    if ((window as any).QRCode) return Promise.resolve((window as any).QRCode);
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js';
      script.onload = () => resolve((window as any).QRCode);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  }

  downloadQr(title: string) {
    if (!this.qrCodeDataUrl) return;
    const a = document.createElement('a');
    a.href = this.qrCodeDataUrl;
    a.download = `qr-${title.replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  }

  closeModal() {
    this.destroyAddMap();
    this.destroyEditMap();
    this.showContentModal = false;
    this.selectedContent = null;
    this.isEditing = false;
    this.errorMessage = '';
  }

  // Save content (create or update)
  async saveContent() {
    if (!this.contentForm.title?.trim()) {
      this.errorMessage = 'Title is required.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    const now = this.formatDate(new Date());

    try {
      if (this.isEditing && this.selectedContent) {
        // ── UPDATE ──────────────────────────────────────────
        const docRef = doc(this.db, this.COLLECTION, this.selectedContent.id);
        const updated: Partial<DestinationContent> = {
          title: this.contentForm.title,
          imageUrl: this.contentForm.imageUrl,
          shortDescription: this.contentForm.shortDescription,
          fullDescription: this.contentForm.fullDescription,
          location: this.contentForm.location,
          locationCoords: this.contentForm.locationCoords || null,
          hours: this.contentForm.hours,
          entranceFee: this.contentForm.entranceFee,
          goodFor: this.contentForm.goodFor,
          parking: this.contentForm.parking,
          contactNumber: this.contentForm.contactNumber,
          website: this.contentForm.website,
          status: this.contentForm.status,
          updatedAt: now
        };
        await updateDoc(docRef, updated as any);

        // Reflect locally without a full re-fetch
        const idx = this.contents.findIndex(c => c.id === this.selectedContent!.id);
        if (idx !== -1) {
          this.contents[idx] = { ...this.contents[idx], ...updated };
        }
      } else {
        // ── CREATE ──────────────────────────────────────────
        const newDoc = {
          title: this.contentForm.title || 'Untitled',
          imageUrl: this.contentForm.imageUrl || 'assets/placeholder.jpg',
          shortDescription: this.contentForm.shortDescription || '',
          fullDescription: this.contentForm.fullDescription || '',
          location: this.contentForm.location || '',
          locationCoords: this.contentForm.locationCoords || null,
          hours: this.contentForm.hours || 'Open daily',
          entranceFee: this.contentForm.entranceFee || 'FREE',
          goodFor: this.contentForm.goodFor || [],
          parking: this.contentForm.parking || 'Available',
          contactNumber: this.contentForm.contactNumber || '',
          website: this.contentForm.website || '',
          status: this.contentForm.status || 'published',
          createdAt: now,
          updatedAt: now
        };
        const docRef = await addDoc(collection(this.db, this.COLLECTION), newDoc);
        this.contents.unshift({ id: docRef.id, ...newDoc } as DestinationContent);
      }

      this.applyFilters();
      this.closeModal();
    } catch (err: any) {
      console.error('Error saving destination:', err);
      this.errorMessage = 'Failed to save. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  // Delete content
  confirmDelete(content: DestinationContent) {
    this.selectedContent = content;
    this.showDeleteConfirm = true;
  }

  async deleteContent() {
    if (!this.selectedContent) return;

    this.isLoading = true;
    this.errorMessage = '';
    try {
      await deleteDoc(doc(this.db, this.COLLECTION, this.selectedContent.id));
      this.contents = this.contents.filter(c => c.id !== this.selectedContent!.id);
      this.applyFilters();
      this.showDeleteConfirm = false;
      this.selectedContent = null;
    } catch (err: any) {
      console.error('Error deleting destination:', err);
      this.errorMessage = 'Failed to delete. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
    this.selectedContent = null;
  }

  // ============= PAGINATION FUNCTIONS =============
  changePage(page: number) { this.currentPage = page; }

  nextPage() {
    if (this.currentPage < this.totalPages) this.changePage(this.currentPage + 1);
  }

  previousPage() {
    if (this.currentPage > 1) this.changePage(this.currentPage - 1);
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  getPageArray(): number[] {
    const pages: number[] = [];
    const max = 5;
    let start = Math.max(1, this.currentPage - Math.floor(max / 2));
    let end = Math.min(this.totalPages, start + max - 1);
    if (end - start + 1 < max) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  get paginatedContents(): DestinationContent[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredContents.slice(start, start + this.itemsPerPage);
  }

  // ============= STATISTICS FUNCTIONS =============
  getTotalPublished(): number { return this.contents.filter(c => c.status === 'published').length; }
  getTotalDraft(): number     { return this.contents.filter(c => c.status === 'draft').length; }

  // ============= TEMP CLOSE FUNCTIONS =============
  openTempCloseModal(content: DestinationContent) {
    this.tempCloseTarget = content;
    this.tempCloseReason = '';
    this.showTempCloseModal = true;
  }

  closeTempCloseModal() {
    this.showTempCloseModal = false;
    this.tempCloseTarget = null;
    this.tempCloseReason = '';
  }

  onTempCloseOverlayClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeTempCloseModal();
    }
  }

  async confirmTempClose() {
    if (!this.tempCloseTarget || !this.tempCloseReason.trim()) return;
    this.isLoading = true;
    try {
      const docRef = doc(this.db, this.COLLECTION, this.tempCloseTarget.id);
      await updateDoc(docRef, {
        tempStatus: 'Temporarily Closed',
        closeReason: this.tempCloseReason,
        closedAt: new Date().toISOString()
      } as any);
      // Update locally
      const idx = this.contents.findIndex(c => c.id === this.tempCloseTarget!.id);
      if (idx !== -1) {
        this.contents[idx] = {
          ...this.contents[idx],
          tempStatus: 'Temporarily Closed',
          closeReason: this.tempCloseReason
        };
      }
      // Update selectedContent if view modal is open
      if (this.selectedContent?.id === this.tempCloseTarget.id) {
        this.selectedContent = { ...this.selectedContent, tempStatus: 'Temporarily Closed', closeReason: this.tempCloseReason };
      }
      this.applyFilters();
      this.closeTempCloseModal();
    } catch (err: any) {
      console.error('Error closing destination:', err);
      this.errorMessage = 'Failed to close destination. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  async reopenDestination(content: DestinationContent) {
    this.isLoading = true;
    try {
      const docRef = doc(this.db, this.COLLECTION, content.id);
      await updateDoc(docRef, { tempStatus: null, closeReason: '', closedAt: null } as any);
      const idx = this.contents.findIndex(c => c.id === content.id);
      if (idx !== -1) {
        this.contents[idx] = { ...this.contents[idx], tempStatus: null, closeReason: '' };
      }
      if (this.selectedContent?.id === content.id) {
        this.selectedContent = { ...this.selectedContent, tempStatus: null, closeReason: '' };
      }
      this.applyFilters();
    } catch (err: any) {
      console.error('Error reopening destination:', err);
      this.errorMessage = 'Failed to reopen destination. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  // ============= NAVIGATION FUNCTIONS =============
  navigateTo(page: string) {
    const routes: { [key: string]: string } = {
      dashboard:           '/dashboard',
      bookings:            '/tourguide',
      feedback:            '/feedback-ratings',
      monitoring:          '/monitoring',
      'number-of-tourist': '/number-of-tourist',
      destinations:        '/destinations',
      'tour-guides': '/tour-guides',
    };
    this.router.navigate([routes[page]]);
  }

  // ============= LOGOUT FUNCTION =============
  logout() { this.authService.logout(); }
}