import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore, collection, getDocs,
  addDoc, doc, updateDoc, deleteDoc,
  Firestore
} from 'firebase/firestore';

// ── Firebase config ───────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            'AIzaSyDS9QJtZBmMBbBZb6Sowxvc-PYEtlHe3LU',
  authDomain:        'seeways-be14b.firebaseapp.com',
  databaseURL:       'https://seeways-be14b-default-rtdb.firebaseio.com',
  projectId:         'seeways-be14b',
  storageBucket:     'seeways-be14b.firebasestorage.app',
  messagingSenderId: '53598789861',
  appId:             '1:53598789861:web:bcae5bc7423a56de49b40c',
  measurementId:     'G-KZT8FJM8LD'
};

const firebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

// ── Interfaces ────────────────────────────────────────────────────────────────
export interface UserAccount {
  id: string;
  firstname: string;
  surname: string;
  suffix?: string;
  nickname?: string;
  email: string;
  contactNumber?: string;
  address?: string;
  gender?: string;
  dateOfBirth?: string;
  nationality?: string;
  img?: string | null;
  isEmailVerified?: boolean;
  residency?: string;
  religion?: string;
  isFullyRegistered: boolean;
  isGoogleUser: boolean;
  createdAt: string;
}

interface UserForm {
  firstname: string;
  surname: string;
  suffix: string;
  nickname: string;
  email: string;
  password: string;
  contactNumber: string;
  address: string;
  gender: string;
  dateOfBirth: string;
  nationality: string;
  isEmailVerified: boolean;
  residency: string;
  religion: string;
}

@Component({
  selector: 'app-users',
  templateUrl: './users_page.html',
  styleUrls: ['./users_page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule]
})
export class UsersPage implements OnInit {

  private db: Firestore = getFirestore(firebaseApp);

  // ── UI state ──────────────────────────────────────────────────────────────
  isFetching:   boolean = false;
  isLoading:    boolean = false;
  errorMessage: string  = '';

  showUserModal: boolean = false;
  showViewModal: boolean = false;
  isEditing:     boolean = false;

  selectedUser: UserAccount | null = null;

  // ── Filters ───────────────────────────────────────────────────────────────
  filterSearch: string = '';
  filterStatus: string = 'All';   // 'All' | 'registered' | 'incomplete'

  // ── Pagination ────────────────────────────────────────────────────────────
  currentPage:  number = 1;
  itemsPerPage: number = 10;
  totalItems:   number = 0;

  // ── Form model ────────────────────────────────────────────────────────────
  userForm: UserForm = this.blankForm();

  // ── Data ──────────────────────────────────────────────────────────────────
  allUsers:      UserAccount[] = [];
  filteredUsers: UserAccount[] = [];

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  // ── Firestore: load ───────────────────────────────────────────────────────
  async loadUsers() {
    this.isFetching = true;
    try {
      const snapshot = await getDocs(collection(this.db, 'users'));
      this.allUsers = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id:                d.id,
          firstname:         data['name']?.firstname   ?? '',
          surname:           data['name']?.surname     ?? '',
          suffix:            data['name']?.suffix      ?? '',
          nickname:          data['nickname']          ?? '',
          email:             data['email']             ?? '',
          contactNumber:     data['contactNumber']     ?? '',
          address:           data['address']           ?? '',
          gender:            data['gender']            ?? '',
          dateOfBirth:       data['dateOfBirth']       ?? '',
          nationality:       data['nationality']       ?? '',
          img:               data['img']               ?? null,
          isEmailVerified:   data['isEmailVerified']   ?? false,
          residency:         data['residency']         ?? '',
          religion:          data['religion']          ?? '',
          isFullyRegistered: data['isFullyRegistered'] ?? false,
          isGoogleUser:      data['isGoogleUser']      ?? false,
          createdAt:         data['createdAt']         ?? '',
        } as UserAccount;
      });
      this.applyFilters();
    } catch (err) {
      this.errorMessage = 'Failed to load users. Please try again.';
      console.error(err);
    } finally {
      this.isFetching = false;
    }
  }

  // ── Firestore: add ────────────────────────────────────────────────────────
  private async firestoreAdd(form: UserForm): Promise<void> {
    await addDoc(collection(this.db, 'users'), {
      name: { firstname: form.firstname, surname: form.surname, suffix: form.suffix },
      nickname:          form.nickname,
      email:             form.email,
      contactNumber:     form.contactNumber,
      address:           form.address,
      gender:            form.gender,
      dateOfBirth:       form.dateOfBirth,
      nationality:       form.nationality,
      isEmailVerified:   form.isEmailVerified,
      residency:         form.residency,
      religion:          form.religion,
      img:               null,
      isFullyRegistered: this.isUserFullyRegistered(form),
    });
  }

  // ── Firestore: update ─────────────────────────────────────────────────────
  private async firestoreUpdate(id: string, form: UserForm): Promise<void> {
    await updateDoc(doc(this.db, 'users', id), {
      name: { firstname: form.firstname, surname: form.surname, suffix: form.suffix },
      nickname:          form.nickname,
      email:             form.email,
      contactNumber:     form.contactNumber,
      address:           form.address,
      gender:            form.gender,
      dateOfBirth:       form.dateOfBirth,
      nationality:       form.nationality,
      isEmailVerified:   form.isEmailVerified,
      residency:         form.residency,
      religion:          form.religion,
      isFullyRegistered: this.isUserFullyRegistered(form),
    });
  }

  private async firestoreDelete(id: string): Promise<void> {
    await deleteDoc(doc(this.db, 'users', id));
  }

  // ── Registration completeness check ──────────────────────────────────────
  isUserFullyRegistered(form: UserForm): boolean {
    return !!(
      form.firstname?.trim() &&
      form.surname?.trim() &&
      form.email?.trim() &&
      form.contactNumber?.trim() &&
      form.address?.trim() &&
      form.gender?.trim() &&
      form.dateOfBirth?.trim() &&
      form.nationality?.trim() &&
      form.residency?.trim() &&
      form.religion?.trim()
    );
  }

  // ── Computed stats ────────────────────────────────────────────────────────
  get totalUsers(): number {
    return this.allUsers.length;
  }

  get activeUsersCount(): number {
    return this.allUsers.filter((u: UserAccount) => u.isFullyRegistered).length;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getFullName(user: UserAccount): string {
    return [user.firstname, user.surname, user.suffix].filter(Boolean).join(' ');
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  formatDate(isoString: string): string {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
    } catch {
      return isoString;
    }
  }

  private blankForm(): UserForm {
    return {
      firstname: '', surname: '', suffix: '', nickname: '',
      email: '', password: '', contactNumber: '',
      address: '', gender: '', dateOfBirth: '',
      nationality: '', isEmailVerified: false,
      residency: '', religion: '',
    };
  }

  // ── Filters ───────────────────────────────────────────────────────────────
  applyFilters() {
    let result = [...this.allUsers];

    if (this.filterSearch.trim()) {
      const term = this.filterSearch.toLowerCase().trim();
      result = result.filter(u =>
        u.firstname.toLowerCase().includes(term) ||
        u.surname.toLowerCase().includes(term)   ||
        u.email.toLowerCase().includes(term)
      );
    }

    if (this.filterStatus === 'complete') {
      result = result.filter(u => u.isFullyRegistered);
    } else if (this.filterStatus === 'incomplete') {
      result = result.filter(u => !u.isFullyRegistered);
    }

    this.filteredUsers = result;
    this.totalItems    = result.length;
    this.currentPage   = 1;
  }

  resetFilters() {
    this.filterSearch  = '';
    this.filterStatus  = 'All';
    this.filteredUsers = [...this.allUsers];
    this.totalItems    = this.allUsers.length;
    this.currentPage   = 1;
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  get paginatedUsers(): UserAccount[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredUsers.slice(start, start + this.itemsPerPage);
  }

  changePage(page: number) { this.currentPage = page; }
  nextPage()     { if (this.currentPage < this.totalPages) this.currentPage++; }
  previousPage() { if (this.currentPage > 1) this.currentPage--; }

  getPageArray(): number[] {
    const max = 5;
    let start = Math.max(1, this.currentPage - Math.floor(max / 2));
    let end   = Math.min(this.totalPages, start + max - 1);
    if (end - start + 1 < max) start = Math.max(1, end - max + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  // ── Add / Edit modal ──────────────────────────────────────────────────────
  openAddUserModal() {
    this.isEditing     = false;
    this.userForm      = this.blankForm();
    this.errorMessage  = '';
    this.showUserModal = true;
  }

  openEditUserModal(user: UserAccount) {
    this.isEditing    = true;
    this.selectedUser = user;
    this.userForm = {
      firstname:         user.firstname,
      surname:           user.surname,
      suffix:            user.suffix        ?? '',
      nickname:          user.nickname      ?? '',
      email:             user.email,
      password:          '',
      contactNumber:     user.contactNumber ?? '',
      address:           user.address       ?? '',
      gender:            user.gender        ?? '',
      dateOfBirth:       user.dateOfBirth   ?? '',
      nationality:       user.nationality   ?? '',
      isEmailVerified:   user.isEmailVerified ?? false,
      residency:         user.residency     ?? '',
      religion:          user.religion      ?? '',
    };
    this.errorMessage  = '';
    this.showUserModal = true;
  }

  closeUserModal() {
    this.showUserModal = false;
    this.isEditing     = false;
  }

  async saveUser() {
    if (!this.userForm.firstname.trim()) {
      this.errorMessage = 'First name is required.';
      return;
    }
    if (!this.userForm.surname.trim()) {
      this.errorMessage = 'Surname is required.';
      return;
    }
    if (!this.userForm.email.trim()) {
      this.errorMessage = 'Email is required.';
      return;
    }
    if (!this.isEditing && !this.userForm.password.trim()) {
      this.errorMessage = 'Password is required for new users.';
      return;
    }

    this.isLoading = true;
    try {
      if (this.isEditing && this.selectedUser) {
        await this.firestoreUpdate(this.selectedUser.id, this.userForm);
      } else {
        await this.firestoreAdd(this.userForm);
      }
      await this.loadUsers();
      this.closeUserModal();
    } catch (err) {
      this.errorMessage = 'Failed to save user. Please try again.';
      console.error(err);
    } finally {
      this.isLoading = false;
    }
  }

  // ── View modal ────────────────────────────────────────────────────────────
  viewUser(user: UserAccount) {
    this.selectedUser  = user;
    this.showViewModal = true;
  }

  closeViewModal() {
    this.showViewModal = false;
    this.selectedUser  = null;
  }

  openEditFromView() {
    const user = this.selectedUser;
    this.closeViewModal();
    if (user) this.openEditUserModal(user);
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async deleteUser(user: UserAccount) {
    if (!confirm(`Are you sure you want to delete "${this.getFullName(user)}"? This action cannot be undone.`)) return;
    try {
      await this.firestoreDelete(user.id);
      this.allUsers = this.allUsers.filter((u: UserAccount) => u.id !== user.id);
      this.applyFilters();
    } catch (err) {
      this.errorMessage = 'Failed to delete user. Please try again.';
      console.error(err);
    }
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
    this.router.navigate([routes[page]]);
  }

  logout() {
    this.authService.logout();
  }
}