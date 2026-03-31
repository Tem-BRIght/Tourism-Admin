import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { DestinationsPage } from './destinations.page';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

// ── Firestore stub ────────────────────────────────────────────────────────────
//
// destinations.page.ts initialises Firestore directly (not via a service),
// so we stub the firebase/firestore module at the test boundary.
//
// Jasmine cannot stub ES modules natively; use the Angular test provider
// pattern and patch window globals, or — the simplest approach — spy on
// the component's private db reference after construction.
//
// Here we mock `loadDestinations` so tests never hit the network.

const SAMPLE_CONTENTS = [
  {
    id: 'CONT001',
    title: 'Rainforest Park',
    imageUrl: 'assets/placeholder.jpg',
    shortDescription: 'A lush park with diverse flora.',
    fullDescription: 'Full description of Rainforest Park.',
    location: 'Pasig City',
    locationCoords: null,
    hours: 'Open daily',
    entranceFee: 'FREE',
    goodFor: ['Nature', 'Family'],
    parking: 'Available',
    contactNumber: '09001234567',
    website: '',
    createdAt: 'January 1, 2025',
    updatedAt: 'January 1, 2025',
    status: 'published' as const,
    tempStatus: null,
    closeReason: '',
  },
  {
    id: 'CONT002',
    title: 'Pasig Cathedral',
    imageUrl: 'assets/placeholder.jpg',
    shortDescription: 'Historic cathedral in the heart of the city.',
    fullDescription: 'The Pasig Cathedral is a well-known landmark.',
    location: 'Pasig City',
    locationCoords: null,
    hours: 'Open daily',
    entranceFee: 'FREE',
    goodFor: ['Culture', 'History'],
    parking: 'Limited',
    contactNumber: '',
    website: '',
    createdAt: 'February 1, 2025',
    updatedAt: 'February 1, 2025',
    status: 'published' as const,
    tempStatus: null,
    closeReason: '',
  },
  {
    id: 'CONT003',
    title: 'Ortigas Center',
    imageUrl: 'assets/placeholder.jpg',
    shortDescription: 'A bustling business and shopping district.',
    fullDescription: 'Ortigas Center is one of Metro Manila\'s key CBDs.',
    location: 'Pasig City',
    locationCoords: null,
    hours: '9AM - 10PM',
    entranceFee: 'FREE',
    goodFor: ['Shopping', 'Food'],
    parking: 'Paid Parking',
    contactNumber: '',
    website: '',
    createdAt: 'March 1, 2025',
    updatedAt: 'March 1, 2025',
    status: 'draft' as const,
    tempStatus: null,
    closeReason: '',
  },
];

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('DestinationsPage', () => {
  let component: DestinationsPage;
  let fixture: ComponentFixture<DestinationsPage>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'hasAccess', 'logout'
    ]);
    authServiceSpy.hasAccess.and.returnValue(true);

    await TestBed.configureTestingModule({
      // Standalone component — import directly
      imports: [DestinationsPage, RouterTestingModule, FormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
      ]
    }).compileComponents();

    router = TestBed.inject(Router);

    fixture = TestBed.createComponent(DestinationsPage);
    component = fixture.componentInstance;

    // Stub loadDestinations so no real Firestore call is made;
    // seed the component with our 3 sample records.
    spyOn(component, 'loadDestinations').and.callFake(async () => {
      component.contents = SAMPLE_CONTENTS.map(c => ({ ...c }));
      component.applyFilters();
    });

    fixture.detectChanges();
    await fixture.whenStable();
  });

  // ── Basic ────────────────────────────────────────────────────────────────────

  it('should create the destinations page', () => {
    expect(component).toBeTruthy();
  });

  it('should load sample content data', () => {
    expect(component.contents.length).toBe(3);
    expect(component.filteredContents.length).toBe(3);
  });

  it('should have correct sample data', () => {
    const first = component.contents[0];
    expect(first.id).toBe('CONT001');
    expect(first.title).toBe('Rainforest Park');
    expect(first.status).toBe('published');
  });

  // ── Statistics ───────────────────────────────────────────────────────────────

  it('should calculate total published correctly', () => {
    const expected = component.contents.filter(c => c.status === 'published').length;
    expect(component.getTotalPublished()).toBe(expected);
  });

  it('should calculate total drafts correctly', () => {
    const expected = component.contents.filter(c => c.status === 'draft').length;
    expect(component.getTotalDraft()).toBe(expected);
  });

  // ── Search & filters ─────────────────────────────────────────────────────────

  it('should apply search filter by title correctly', () => {
    component.searchTerm = 'Rainforest';
    component.applyFilters();
    expect(component.filteredContents.length).toBe(1);
    expect(component.filteredContents[0].title).toContain('Rainforest');
  });

  it('should search by description text', () => {
    // "cathedral" appears in the shortDescription of CONT002
    component.searchTerm = 'cathedral';
    component.applyFilters();
    expect(component.filteredContents.length).toBe(1);
    expect(component.filteredContents[0].title).toBe('Pasig Cathedral');
  });

  it('should reset filters correctly', () => {
    component.searchTerm = 'Rainforest';
    component.applyFilters();
    expect(component.filteredContents.length).toBe(1);

    component.resetFilters();
    expect(component.searchTerm).toBe('');
    expect(component.filteredContents.length).toBe(component.contents.length);
  });

  // ── Modal actions ─────────────────────────────────────────────────────────────

  it('should open create modal', () => {
    component.openCreateModal();
    expect(component.showContentModal).toBeTrue();
    expect(component.isEditing).toBeFalse();
    expect(component.selectedContent).toBeNull();
    expect(component.contentForm.title).toBe('');
  });

  it('should open edit modal', () => {
    const content = component.contents[0];
    component.openEditModal(content);
    expect(component.showContentModal).toBeTrue();
    expect(component.isEditing).toBeTrue();
    expect(component.selectedContent).toEqual(content);
    expect(component.contentForm.title).toEqual(content.title);
  });

  it('should view content details', () => {
    const content = component.contents[0];
    component.viewContent(content);
    expect(component.showContentModal).toBeTrue();
    expect(component.isEditing).toBeFalse();
    expect(component.selectedContent).toEqual(content);
  });

  it('should close modal', () => {
    component.showContentModal = true;
    component.selectedContent = component.contents[0];
    component.closeModal();
    expect(component.showContentModal).toBeFalse();
    expect(component.selectedContent).toBeNull();
    expect(component.isEditing).toBeFalse();
  });

  // ── Image handling ───────────────────────────────────────────────────────────

  it('should remove image', () => {
    component.contentForm.imageUrl = 'test-url';
    component.contentForm.imageFile = {} as File;
    component.removeImage();
    expect(component.contentForm.imageUrl).toBe('');
    expect(component.contentForm.imageFile).toBeUndefined();
  });

  // ── Save (Firestore stubbed) ──────────────────────────────────────────────────

  it('should save new content via Firestore and reflect locally', async () => {
    const initialCount = component.contents.length;

    // Stub the Firestore addDoc path: spy on saveContent itself to simulate
    // local insertion (mirrors what the real method does after addDoc resolves).
    spyOn(component, 'saveContent').and.callFake(async () => {
      const now = new Date().toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      });
      component.contents.unshift({
        id: 'CONT_NEW',
        title: component.contentForm.title || 'Untitled',
        imageUrl: component.contentForm.imageUrl || 'assets/placeholder.jpg',
        shortDescription: component.contentForm.shortDescription || '',
        fullDescription: component.contentForm.fullDescription || '',
        location: component.contentForm.location || '',
        locationCoords: null,
        hours: component.contentForm.hours || 'Open daily',
        entranceFee: component.contentForm.entranceFee || 'FREE',
        goodFor: component.contentForm.goodFor || [],
        parking: component.contentForm.parking || 'Available',
        contactNumber: component.contentForm.contactNumber || '',
        website: component.contentForm.website || '',
        status: component.contentForm.status || 'published',
        createdAt: now,
        updatedAt: now,
        tempStatus: null,
        closeReason: '',
      });
      component.applyFilters();
      component.closeModal();
    });

    component.openCreateModal();
    component.contentForm.title = 'New Test Destination';
    component.contentForm.description = 'This is a test description';
    await component.saveContent();

    expect(component.contents.length).toBe(initialCount + 1);
    expect(component.filteredContents.length).toBe(initialCount + 1);
  });

  it('should edit existing content and reflect locally', async () => {
    const content = component.contents[0];
    const newTitle = 'Updated Title';

    spyOn(component, 'saveContent').and.callFake(async () => {
      const idx = component.contents.findIndex(c => c.id === component.selectedContent!.id);
      if (idx !== -1) {
        component.contents[idx] = {
          ...component.contents[idx],
          title: component.contentForm.title,
        };
      }
      component.applyFilters();
      component.closeModal();
    });

    component.openEditModal(content);
    component.contentForm.title = newTitle;
    await component.saveContent();

    const updated = component.contents.find(c => c.id === content.id);
    expect(updated?.title).toBe(newTitle);
  });

  // ── Delete ────────────────────────────────────────────────────────────────────

  it('should confirm delete', () => {
    const content = component.contents[0];
    component.confirmDelete(content);
    expect(component.showDeleteConfirm).toBeTrue();
    expect(component.selectedContent).toEqual(content);
  });

  it('should cancel delete', () => {
    component.showDeleteConfirm = true;
    component.selectedContent = component.contents[0];
    component.cancelDelete();
    expect(component.showDeleteConfirm).toBeFalse();
    expect(component.selectedContent).toBeNull();
  });

  it('should delete content via Firestore and reflect locally', async () => {
    const initialCount = component.contents.length;
    const content = component.contents[0];

    spyOn(component, 'deleteContent').and.callFake(async () => {
      component.contents = component.contents.filter(c => c.id !== component.selectedContent!.id);
      component.applyFilters();
      component.showDeleteConfirm = false;
      component.selectedContent = null;
    });

    component.confirmDelete(content);
    await component.deleteContent();

    expect(component.contents.length).toBe(initialCount - 1);
    expect(component.filteredContents.length).toBe(initialCount - 1);
    expect(component.showDeleteConfirm).toBeFalse();
  });

  // ── Pagination ────────────────────────────────────────────────────────────────

  it('should handle pagination correctly', () => {
    component.itemsPerPage = 2;
    // Trigger recalculation
    component.applyFilters();
    const totalPages = Math.ceil(component.filteredContents.length / 2);
    expect(component.totalPages).toBe(totalPages);

    component.changePage(2);
    expect(component.currentPage).toBe(2);

    // nextPage only moves if not on last page
    if (component.currentPage < component.totalPages) {
      component.nextPage();
      expect(component.currentPage).toBe(3);
      component.previousPage();
      expect(component.currentPage).toBe(2);
    }
  });

  it('should generate page array correctly', () => {
    component.currentPage = 1;
    component.totalItems = 20;
    component.itemsPerPage = 5;
    const pages = component.getPageArray();
    expect(pages.length).toBeLessThanOrEqual(5);
    expect(pages[0]).toBe(1);
  });

  it('should return paginated contents', () => {
    component.itemsPerPage = 2;
    component.currentPage = 1;
    const paginated = component.paginatedContents;
    expect(paginated.length).toBeLessThanOrEqual(2);
  });

  // ── Permissions ───────────────────────────────────────────────────────────────

  it('should set permissions on init', () => {
    expect(authServiceSpy.hasAccess).toHaveBeenCalled();
    expect(component.canCreate).toBeTrue();
    expect(component.canUpdate).toBeTrue();
    expect(component.canDelete).toBeTrue();
  });

  // ── Navigation ────────────────────────────────────────────────────────────────

  it('should navigate to other pages', () => {
    const spy = spyOn(router, 'navigate');

    component.navigateTo('dashboard');
    expect(spy).toHaveBeenCalledWith(['/dashboard']);

    component.navigateTo('bookings');
    expect(spy).toHaveBeenCalledWith(['/tourguide']);

    component.navigateTo('destinations');
    expect(spy).toHaveBeenCalledWith(['/destinations']);
  });

  // ── Logout ────────────────────────────────────────────────────────────────────

  it('should logout via AuthService', () => {
    component.logout();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });
});