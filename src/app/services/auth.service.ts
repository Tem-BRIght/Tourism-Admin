import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

export type UserRole = 'superadmin' | 'admin' | 'user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userRole: UserRole = 'admin'; // This would come from your backend
  private userEmail: string = '';
  private userId: string = 'USR001'; // Sample user ID

  constructor(private router: Router) {
    const email = localStorage.getItem('userEmail');
    if (email) {
      this.userEmail = email;
    }
  }

  // User info functions
  getRole(): UserRole {
    return this.userRole;
  }

  getEmail(): string {
    return this.userEmail;
  }

  getUserId(): string {
    return this.userId;
  }

  // Permission check function
  hasAccess(permission: {
    table: string,
    action: 'create' | 'read' | 'update' | 'delete'
  }): boolean {
    const role = this.userRole;
    const matrix: any = {
      superadmin: {
        users: { create: true, read: true, update: true, delete: true },
        destinations: { create: true, read: true, update: true, delete: true },
        tour_guides: { create: true, read: true, update: true, delete: true },
        bookings: { create: true, read: true, update: true, delete: true },
        feedback: { create: true, read: true, update: true, delete: true },
        system_logs: { create: true, read: true, update: true, delete: true },
        analytics_data: { create: true, read: true, update: true, delete: true },
        system_config: { create: true, read: true, update: true, delete: true }
      },
      admin: {
        users: { create: false, read: true, update: false, delete: false },
        destinations: { create: false, read: true, update: false, delete: false },
        tour_guides: { create: false, read: true, update: true, delete: false },
        bookings: { create: true, read: true, update: true, delete: true },
        feedback: { create: false, read: true, update: false, delete: false },
        system_logs: { create: false, read: true, update: false, delete: false },
        analytics_data: { create: false, read: true, update: false, delete: false },
        system_config: { create: false, read: false, update: false, delete: false }
      },
      user: {
        users: { create: false, read: true, update: true, delete: false },
        destinations: { create: false, read: true, update: false, delete: false },
        tour_guides: { create: false, read: true, update: false, delete: false },
        bookings: { create: true, read: true, update: true, delete: true },
        feedback: { create: true, read: true, update: false, delete: false },
        system_logs: { create: false, read: false, update: false, delete: false },
        analytics_data: { create: false, read: false, update: false, delete: false },
        system_config: { create: false, read: false, update: false, delete: false }
      }
    };

    return matrix[role]?.[permission.table]?.[permission.action] || false;
  }

  // Role check functions
  isAdmin(): boolean {
    return this.userRole === 'admin' || this.userRole === 'superadmin';
  }

  isSuperAdmin(): boolean {
    return this.userRole === 'superadmin';
  }

  // Logout function
  logout() {
    localStorage.removeItem('userEmail');
    this.userRole = 'user';
    this.router.navigate(['/login']);
  }
}