import { Injectable } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { Observable } from 'rxjs';

export interface Tourist {
  id?: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  visitDate: string;
  feedback?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TouristService {
  private baseDbPath = 'tourists';

  constructor(private firebaseService: FirebaseService) {}

  /**
   * Get all tourists
   */
  getTourists(): Observable<any> {
    return this.firebaseService.listenToData(this.baseDbPath);
  }

  /**
   * Get a single tourist by ID
   */
  async getTouristById(id: string): Promise<Tourist | null> {
    return this.firebaseService.readData(`${this.baseDbPath}/${id}`);
  }

  /**
   * Add a new tourist
   */
  async addTourist(tourist: Tourist): Promise<string> {
    const id = this.generateId();
    const touristData = { ...tourist, id, createdAt: new Date().toISOString() };
    await this.firebaseService.writeData(`${this.baseDbPath}/${id}`, touristData);
    return id;
  }

  /**
   * Update an existing tourist
   */
  async updateTourist(id: string, tourist: Partial<Tourist>): Promise<void> {
    const updateData = { ...tourist, updatedAt: new Date().toISOString() };
    await this.firebaseService.updateData(`${this.baseDbPath}/${id}`, updateData);
  }

  /**
   * Delete a tourist
   */
  async deleteTourist(id: string): Promise<void> {
    await this.firebaseService.deleteData(`${this.baseDbPath}/${id}`);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `tourist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
