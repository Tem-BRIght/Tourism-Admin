import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { TourGuideManagementPage } from './tour-guide-management.page';
import { AuthService } from '../../services/auth.service';

const authServiceStub = {
  hasAccess: () => true,
  logout: () => {}
};

describe('TourGuideManagementPage', () => {
  let component: TourGuideManagementPage;
  let fixture: ComponentFixture<TourGuideManagementPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TourGuideManagementPage,   // standalone component
        CommonModule,
        FormsModule,
        RouterTestingModule,
        IonicModule.forRoot()
      ],
      providers: [
        { provide: AuthService, useValue: authServiceStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TourGuideManagementPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the Tour Guide page', () => {
    expect(component).toBeTruthy();
  });

  it('should start with empty guides list', () => {
    expect(component.guides).toEqual([]);
  });

  it('should open add guide modal with blank form', () => {
    component.openAddGuideModal();
    expect(component.showGuideModal).toBeTrue();
    expect(component.isEditing).toBeFalse();
    expect(component.guideForm.name).toBe('');
  });

  it('should open edit guide modal pre-filled', () => {
    const mockGuide = {
      id: '1', name: 'Juan Dela Cruz', email: 'juan@example.com',
      phone: '09171234567', status: 'active' as const, createdAt: 'Jan 1, 2024'
    };
    component.openEditGuideModal(mockGuide);
    expect(component.showGuideModal).toBeTrue();
    expect(component.isEditing).toBeTrue();
    expect(component.guideForm.name).toBe('Juan Dela Cruz');
  });

  it('should not save guide when name is empty', async () => {
    component.guideForm.name = '  ';
    await component.saveGuide();
    expect(component.errorMessage).toBe('Name is required.');
  });

  it('should toggle tourist selection', () => {
    component.scannedTourists = [
      { id: 'T1', name: 'Alice', email: 'alice@example.com' },
      { id: 'T2', name: 'Bob',   email: 'bob@example.com'   }
    ];
    component.toggleTouristSelection('T1');
    expect(component.isTouristSelected('T1')).toBeTrue();
    component.toggleTouristSelection('T1');
    expect(component.isTouristSelected('T1')).toBeFalse();
  });

  it('should select all tourists', () => {
    component.scannedTourists = [
      { id: 'T1', name: 'Alice', email: 'alice@example.com' },
      { id: 'T2', name: 'Bob',   email: 'bob@example.com'   }
    ];
    component.selectAllTourists();
    expect(component.scheduleForm.selectedTouristIds.length).toBe(2);
  });

  it('should clear tourist selection', () => {
    component.scheduleForm.selectedTouristIds = ['T1', 'T2'];
    component.clearTouristSelection();
    expect(component.scheduleForm.selectedTouristIds.length).toBe(0);
  });

  it('should close schedule modal and reset data', () => {
    component.showScheduleModal = true;
    component.guideDestinations = [{ id: 'd1', name: 'Palawan' }];
    component.scannedTourists = [{ id: 't1', name: 'Alice', email: 'a@b.com' }];
    component.closeScheduleModal();
    expect(component.showScheduleModal).toBeFalse();
    expect(component.guideDestinations).toEqual([]);
    expect(component.scannedTourists).toEqual([]);
  });

  it('should report allTouristsSelected correctly', () => {
    component.scannedTourists = [
      { id: 'T1', name: 'Alice', email: 'alice@example.com' },
      { id: 'T2', name: 'Bob',   email: 'bob@example.com'   }
    ];
    component.scheduleForm.selectedTouristIds = [];
    expect(component.allTouristsSelected).toBeFalse();
    component.selectAllTourists();
    expect(component.allTouristsSelected).toBeTrue();
  });

  it('should return false for isTouristSelected when list is empty', () => {
    component.scheduleForm.selectedTouristIds = [];
    expect(component.isTouristSelected('T99')).toBeFalse();
  });
});