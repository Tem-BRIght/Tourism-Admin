import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonItem, IonLabel, IonInput,
  IonCheckbox, IonButton
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';

// Firebase imports
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDS9QJtZBmMBbBZb6Sowxvc-PYEtlHe3LU',
  authDomain: 'seeways-be14b.firebaseapp.com',
  databaseURL: 'https://seeways-be14b-default-rtdb.firebaseio.com',
  projectId: 'seeways-be14b',
  storageBucket: 'seeways-be14b.firebasestorage.app',
  messagingSenderId: '53598789861',
  appId: '1:53598789861:web:bcae5bc7423a56de49b40c',
  measurementId: 'G-KZT8FJM8LD',
};

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonItem, IonLabel, IonInput,
    IonCheckbox, IonButton, CommonModule, FormsModule
  ]
})
export class LoginPage implements OnInit {
  email: string = '';
  password: string = '';
  rememberMe: boolean = false;
  isLoading: boolean = false;

  private auth: Auth;

  constructor(private router: Router) {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    this.auth = getAuth(app);
  }

  ngOnInit() {}

  async login() {
    if (!this.email || !this.password) {
      alert('Please fill in all fields.');
      return;
    }

    this.isLoading = true;
    try {
      await signInWithEmailAndPassword(this.auth, this.email, this.password);

      if (this.rememberMe) {
        localStorage.setItem('userEmail', this.email);
      }

      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      alert(this.friendlyError(err.code));
    } finally {
      this.isLoading = false;
    }
  }

  private friendlyError(code: string): string {
    const map: Record<string, string> = {
      'auth/invalid-email':          'Please enter a valid email address.',
      'auth/user-not-found':         'No account found with this email.',
      'auth/wrong-password':         'Incorrect password. Please try again.',
      'auth/too-many-requests':      'Too many attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Check your connection.',
    };
    return map[code] ?? 'An unexpected error occurred. Please try again.';
  }
}