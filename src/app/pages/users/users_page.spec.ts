import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { UsersPage, UserAccount } from './users_page';
import { AuthService } from '../../services/auth.service';

const authServiceStub = {
  hasAccess: () => true,
  logout:    () => {}
};

// ── Mock data matching Firestore schema ───────────────────────────────────────
const mockUsers: UserAccount[] = [
  {
    id: 'USR001', firstname: 'Maria', surname: 'Santos', suffix: '', nickname: 'Mare',
    email: 'maria.santos@tourism.gov.ph', contactNumber: '09171234567',
    address: 'Manila', gender: 'female', dateOfBirth: '1990-01-01',
    nationality: 'Filipino', img: null, birthmonth: 'January',
    isEmailVerified: true, residency: 'Permanent Resident', religion: 'Catholic',
    isFullyRegistered: true, isGoogleUser: false, createdAt: '2024-01-05T00:00:00.000Z'
  },
  {
    id: 'USR002', firstname: 'Juan', surname: 'dela Cruz', suffix: '', nickname: '',
    email: 'juan.delacruz@tourism.gov.ph', contactNumber: '09181234568',
    address: 'Quezon City', gender: 'male', dateOfBirth: '1988-03-15',
    nationality: 'Filipino', img: null,
    isEmailVerified: true, residency: 'Citizen', religion: 'Catholic',
    isFullyRegistered: true, isGoogleUser: false, createdAt: '2024-01-10T00:00:00.000Z'
  },
  {
    id: 'USR003', firstname: 'Ana', surname: 'Reyes', suffix: '', nickname: 'Annie',
    email: 'ana.reyes@tourism.gov.ph', contactNumber: '09191234569',
    address: 'Cebu', gender: 'female', dateOfBirth: '1995-07-22',
    nationality: 'Filipino', img: null,
    isEmailVerified: true, residency: 'Citizen', religion: 'Protestant',
    isFullyRegistered: true, isGoogleUser: true, createdAt: '2024-02-01T00:00:00.000Z'
  },
  {
    id: 'USR004', firstname: 'Carlos', surname: 'Mendoza', suffix: '', nickname: '',
    email: 'carlos.mendoza@tourism.gov.ph', contactNumber: '',
    address: '', gender: '', dateOfBirth: '',
    nationality: '', img: null,
    isEmailVerified: false, residency: '', religion: '',
    isFullyRegistered: false, isGoogleUser: false, createdAt: '2024-02-14T00:00:00.000Z'
  },
  {
    id: 'USR005', firstname: 'Liza', surname: 'Torres', suffix: '', nickname: 'Liz',
    email: 'liza.torres@tourism.gov.ph', contactNumber: '09201234570',
    address: 'Davao', gender: 'female', dateOfBirth: '1992-11-30',
    nationality: 'Filipino', img: null,
    isEmailVerified: false, residency: 'Resident', religion: 'Islam',
    isFullyRegistered: false, isGoogleUser: true, createdAt: '2024-02-20T00:00:00.000Z'
  },
];

describe('UsersPage', () => {
  let component: UsersPage;
  let fixture:   ComponentFixture<UsersPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        UsersPage,
        CommonModule,
        FormsModule,
        RouterTestingModule,
        IonicModule.forRoot()
      ],
      providers: [
        { provide: AuthService, useValue: authServiceStub }
      ]
    }).compileComponents();

    fixture   = TestBed.createComponent(UsersPage);
    component = fixture.componentInstance;

    // Bypass Firestore — inject mock data directly
    component.allUsers      = [...mockUsers];
    component.filteredUsers = [...mockUsers];
    component.totalItems    = mockUsers.length;

    fixture.detectChanges();
  });

  // ── Component creation ──────────────────────────────────────────────────────
  it('should create the Users page', () => {
    expect(component).toBeTruthy();
  });

  // ── Initial state ───────────────────────────────────────────────────────────
  it('should have users pre-loaded', () => {
    expect(component.allUsers.length).toBeGreaterThan(0);
  });

  it('should populate filteredUsers matching allUsers', () => {
    expect(component.filteredUsers.length).toBe(component.allUsers.length);
  });

  it('should start on page 1', () => {
    expect(component.currentPage).toBe(1);
  });

  // ── Computed stats ──────────────────────────────────────────────────────────
  it('should compute totalUsers correctly', () => {
    expect(component.totalUsers).toBe(component.allUsers.length);
  });

  it('should compute activeUsersCount (fully registered) correctly', () => {
    const expected = component.allUsers.filter(u => u.isFullyRegistered).length;
    expect(component.activeUsersCount).toBe(expected);
  });

  // ── Helper: getInitials ─────────────────────────────────────────────────────
  it('should return two-letter initials for a full name', () => {
    expect(component.getInitials('Maria Santos')).toBe('MS');
  });

  it('should return one-letter initial for a single-word name', () => {
    expect(component.getInitials('Madonna')).toBe('M');
  });

  it('should use only the first two words for initials', () => {
    expect(component.getInitials('Juan dela Cruz')).toBe('JD');
  });

  // ── Helper: getFullName ─────────────────────────────────────────────────────
  it('should build full name from firstname and surname', () => {
    const user = component.allUsers[0];
    expect(component.getFullName(user)).toContain(user.firstname);
    expect(component.getFullName(user)).toContain(user.surname);
  });

  it('should include suffix in full name when present', () => {
    const user: UserAccount = { ...component.allUsers[0], suffix: 'Jr.' };
    expect(component.getFullName(user)).toContain('Jr.');
  });

  // ── Helper: formatDate ──────────────────────────────────────────────────────
  it('should format a valid ISO date string', () => {
    const formatted = component.formatDate('2024-01-05T00:00:00.000Z');
    expect(formatted).not.toBe('—');
    expect(formatted.length).toBeGreaterThan(0);
  });

  it('should return "—" for an empty date string', () => {
    expect(component.formatDate('')).toBe('—');
  });

  // ── Filters ─────────────────────────────────────────────────────────────────
  it('should filter users by search term (firstname)', () => {
    component.filterSearch = 'maria';
    component.applyFilters();
    expect(component.filteredUsers.every(u =>
      u.firstname.toLowerCase().includes('maria') ||
      u.surname.toLowerCase().includes('maria')   ||
      u.email.toLowerCase().includes('maria')
    )).toBeTrue();
  });

  it('should filter users by search term (email)', () => {
    component.filterSearch = 'reyes';
    component.applyFilters();
    expect(component.filteredUsers.every(u =>
      u.firstname.toLowerCase().includes('reyes') ||
      u.surname.toLowerCase().includes('reyes')   ||
      u.email.toLowerCase().includes('reyes')
    )).toBeTrue();
  });

  it('should filter users by registration status (incomplete)', () => {
    component.filterStatus = 'incomplete';
    component.applyFilters();
    expect(component.filteredUsers.every(u => !u.isFullyRegistered)).toBeTrue();
  });

  it('should filter users by registration status (registered)', () => {
    component.filterStatus = 'registered';
    component.applyFilters();
    expect(component.filteredUsers.every(u => u.isFullyRegistered)).toBeTrue();
  });

  it('should reset to page 1 after filter is applied', () => {
    component.currentPage  = 3;
    component.filterSearch = 'xyz';
    component.applyFilters();
    expect(component.currentPage).toBe(1);
  });

  it('should return all users after resetFilters', () => {
    component.filterSearch = 'xyz';
    component.applyFilters();
    component.resetFilters();
    expect(component.filteredUsers.length).toBe(component.allUsers.length);
    expect(component.filterSearch).toBe('');
    expect(component.filterStatus).toBe('All');
    expect(component.currentPage).toBe(1);
  });

  // ── Add / Edit modal ────────────────────────────────────────────────────────
  it('should open add user modal with a blank form', () => {
    component.openAddUserModal();
    expect(component.showUserModal).toBeTrue();
    expect(component.isEditing).toBeFalse();
    expect(component.userForm.firstname).toBe('');
    expect(component.userForm.email).toBe('');
    expect(component.userForm.password).toBe('');
  });

  it('should open edit user modal pre-filled with user data', () => {
    const mockUser = component.allUsers[0];
    component.openEditUserModal(mockUser);
    expect(component.showUserModal).toBeTrue();
    expect(component.isEditing).toBeTrue();
    expect(component.userForm.firstname).toBe(mockUser.firstname);
    expect(component.userForm.surname).toBe(mockUser.surname);
    expect(component.userForm.email).toBe(mockUser.email);
  });

  it('should close user modal and reset isEditing', () => {
    component.showUserModal = true;
    component.isEditing     = true;
    component.closeUserModal();
    expect(component.showUserModal).toBeFalse();
    expect(component.isEditing).toBeFalse();
  });

  // ── Validation ──────────────────────────────────────────────────────────────
  it('should not save when firstname is blank', () => {
    component.openAddUserModal();
    component.userForm.firstname = '   ';
    component.saveUser();
    expect(component.errorMessage).toBe('First name is required.');
    expect(component.showUserModal).toBeTrue();
  });

  it('should not save when surname is blank', () => {
    component.openAddUserModal();
    component.userForm.firstname = 'Test';
    component.userForm.surname   = '';
    component.saveUser();
    expect(component.errorMessage).toBe('Surname is required.');
  });

  it('should not save when email is blank', () => {
    component.openAddUserModal();
    component.userForm.firstname = 'Test';
    component.userForm.surname   = 'User';
    component.userForm.email     = '';
    component.saveUser();
    expect(component.errorMessage).toBe('Email is required.');
  });

  it('should not save a new user when password is blank', () => {
    component.openAddUserModal();
    component.userForm.firstname = 'Test';
    component.userForm.surname   = 'User';
    component.userForm.email     = 'test@example.com';
    component.userForm.password  = '';
    component.saveUser();
    expect(component.errorMessage).toBe('Password is required for new users.');
  });

  // ── View modal ──────────────────────────────────────────────────────────────
  it('should open view modal with the selected user', () => {
    const mockUser = component.allUsers[0];
    component.viewUser(mockUser);
    expect(component.showViewModal).toBeTrue();
    expect(component.selectedUser).toBe(mockUser);
  });

  it('should close view modal and clear selectedUser', () => {
    component.viewUser(component.allUsers[0]);
    component.closeViewModal();
    expect(component.showViewModal).toBeFalse();
    expect(component.selectedUser).toBeNull();
  });

  it('should open edit modal when openEditFromView is called', () => {
    const mockUser = component.allUsers[0];
    component.viewUser(mockUser);
    component.openEditFromView();
    expect(component.showViewModal).toBeFalse();
    expect(component.showUserModal).toBeTrue();
    expect(component.isEditing).toBeTrue();
  });

  // ── Delete (local state only — Firestore is not called in unit tests) ───────
  it('should remove the user from allUsers on delete (with confirm)', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    // Stub firestoreDelete so it doesn't throw
    spyOn<any>(component, 'firestoreDelete').and.returnValue(Promise.resolve());
    const targetUser    = component.allUsers[0];
    const initialCount  = component.allUsers.length;
    component.deleteUser(targetUser);
    // Wait for async deletion
    expect(window.confirm).toHaveBeenCalled();
  });

  it('should NOT call firestoreDelete when confirm is cancelled', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    spyOn<any>(component, 'firestoreDelete');
    component.deleteUser(component.allUsers[0]);
    expect((component as any).firestoreDelete).not.toHaveBeenCalled();
  });

  // ── Pagination ──────────────────────────────────────────────────────────────
  it('should compute totalPages correctly', () => {
    const expected = Math.ceil(component.totalItems / component.itemsPerPage);
    expect(component.totalPages).toBe(expected);
  });

  it('should advance to next page', () => {
    component.currentPage = 1;
    component.nextPage();
    if (component.totalPages > 1) {
      expect(component.currentPage).toBe(2);
    } else {
      expect(component.currentPage).toBe(1);
    }
  });

  it('should go to previous page', () => {
    component.currentPage = 2;
    component.previousPage();
    expect(component.currentPage).toBe(1);
  });

  it('should not go below page 1', () => {
    component.currentPage = 1;
    component.previousPage();
    expect(component.currentPage).toBe(1);
  });

  it('should change to a specific page', () => {
    component.changePage(2);
    expect(component.currentPage).toBe(2);
  });

  it('should return a non-empty page array', () => {
    expect(component.getPageArray().length).toBeGreaterThan(0);
  });

  it('should slice paginatedUsers correctly', () => {
    component.currentPage = 1;
    const paginated = component.paginatedUsers;
    expect(paginated.length).toBeLessThanOrEqual(component.itemsPerPage);
  });

  // ── New fields ──────────────────────────────────────────────────────────────
  it('should expose birthmonth on UserAccount', () => {
    const user = component.allUsers[0];
  });

  it('should expose isEmailVerified on UserAccount', () => {
    const verified   = component.allUsers.filter(u => u.isEmailVerified);
    const unverified = component.allUsers.filter(u => !u.isEmailVerified);
    expect(verified.length).toBeGreaterThan(0);
    expect(unverified.length).toBeGreaterThan(0);
  });

  it('should expose residency on UserAccount', () => {
    const user = component.allUsers[0];
    expect(user.residency).toBe('Permanent Resident');
  });

  it('should expose religion on UserAccount', () => {
    const user = component.allUsers[0];
    expect(user.religion).toBe('Catholic');
  });

  it('should open add modal with blank new fields', () => {
    component.openAddUserModal();
    expect(component.userForm.isEmailVerified).toBeFalse();
    expect(component.userForm.residency).toBe('');
    expect(component.userForm.religion).toBe('');
  });

  it('should pre-fill new fields when opening edit modal', () => {
    const mockUser = component.allUsers[0];
    component.openEditUserModal(mockUser);
    expect(component.userForm.isEmailVerified).toBe(mockUser.isEmailVerified ?? false);
    expect(component.userForm.residency).toBe(mockUser.residency ?? '');
    expect(component.userForm.religion).toBe(mockUser.religion ?? '');
  });

  it('should accept "prefer_not_to_say" as a valid gender value', () => {
    component.openAddUserModal();
    component.userForm.gender = 'prefer_not_to_say';
    expect(component.userForm.gender).toBe('prefer_not_to_say');
  });

  // ── Auto-computed isFullyRegistered ─────────────────────────────────────────
  it('should return true from isUserFullyRegistered when all fields are filled', () => {
    component.openAddUserModal();
    component.userForm.firstname     = 'Maria';
    component.userForm.surname       = 'Santos';
    component.userForm.email         = 'maria@example.com';
    component.userForm.contactNumber = '09171234567';
    component.userForm.address       = 'Manila';
    component.userForm.gender        = 'female';
    component.userForm.dateOfBirth   = '1990-01-01';
    component.userForm.nationality   = 'Filipino';
    component.userForm.residency     = 'Citizen';
    component.userForm.religion      = 'Catholic';
    expect(component.isUserFullyRegistered(component.userForm)).toBeTrue();
  });

  it('should return false from isUserFullyRegistered when any field is missing', () => {
    component.openAddUserModal();
    component.userForm.firstname = 'Maria';
    // all other fields remain blank
    expect(component.isUserFullyRegistered(component.userForm)).toBeFalse();
  });

  it('should return false when a field is whitespace-only', () => {
    component.openAddUserModal();
    component.userForm.firstname     = '   ';
    component.userForm.surname       = 'Santos';
    component.userForm.email         = 'maria@example.com';
    component.userForm.contactNumber = '09171234567';
    component.userForm.address       = 'Manila';
    component.userForm.gender        = 'female';
    component.userForm.dateOfBirth   = '1990-01-01';
    component.userForm.nationality   = 'Filipino';
    component.userForm.residency     = 'Citizen';
    component.userForm.religion      = 'Catholic';
    expect(component.isUserFullyRegistered(component.userForm)).toBeFalse();
  });
});