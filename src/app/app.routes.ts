import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage)
  },
  {
    path: 'tourguide',
    loadComponent: () => import('./pages/tourguide/tour-guide-page').then(m => m.TourGuidePage)
  },
  {
    path: 'feedback-ratings',
    loadComponent: () => import('./pages/feedback/feedback-rating.page').then(m => m.FeedbackRatingsPage)
  },
  {
    path: 'monitoring',
    loadComponent: () => import('./pages/monitor/monitor-activity.page').then(m => m.MonitorActivityPage)
  },
  {
    path: 'number-of-tourist',
    loadComponent: () => import('./pages/numoftourist/number-of-tourist.page').then(m => m.NumberOfTouristPage)
  },
  {
    path: 'destinations',
    loadComponent: () => import('./pages/destinations/destinations.page').then(m => m.DestinationsPage)
  },
  {
    path: 'tour-guides',
    loadComponent: () => import('./pages/tourguide-Management/tour-guide-management.page').then(m => m.TourGuideManagementPage)
  },
  {
    path: 'users',
    loadComponent: () => import('./pages/users/users_page').then(m => m.UsersPage)
  }
];
