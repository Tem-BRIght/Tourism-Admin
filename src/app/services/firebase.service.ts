// src/app/services/firebase.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  Firestore,
  DocumentData,
  DocumentReference,
  CollectionReference,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';

import { environment } from '../../environments/environment';

const app = getApps().length ? getApps()[0] : initializeApp(environment.firebaseConfig);

// Prevent duplicate app initialization
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private firestore: Firestore = getFirestore(app);
  private storage = getStorage(app);

  private normalizePath(path: string): string {
    return path.replace(/^\/+|\/+$/g, '');
  }

  private getDocRef(path: string): DocumentReference<DocumentData> {
    const normalized = this.normalizePath(path);
    const parts = normalized.split('/').filter(Boolean);
    if (parts.length % 2 !== 0) {
      throw new Error(`Firestore document path must contain collections and document IDs (even number of segments): ${path}`);
    }
    return doc(this.firestore, normalized);
  }

  private getCollectionRef(path: string): CollectionReference<DocumentData> {
    const normalized = this.normalizePath(path);
    const parts = normalized.split('/').filter(Boolean);
    if (parts.length % 2 === 0) {
      throw new Error(`Firestore collection path must contain an odd number of segments: ${path}`);
    }
    return collection(this.firestore, normalized);
  }

  private snapshotToData(snapshot: QueryDocumentSnapshot<DocumentData>) {
    return { id: snapshot.id, ...snapshot.data() };
  }

  /** Write/overwrite a document at path (collection/doc) */
  writeData(path: string, value: any): Promise<void> {
    const docRef = this.getDocRef(path);
    return setDoc(docRef, value);
  }

  /** Add a new document to a collection path and return the document reference */
  pushData(path: string, value: any) {
    const colRef = this.getCollectionRef(path);
    return addDoc(colRef, value);
  }

  /** Update fields in a document at path */
  updateData(path: string, value: any): Promise<void> {
    const docRef = this.getDocRef(path);
    return updateDoc(docRef, value);
  }

  /** Delete a document at path */
  deleteData(path: string): Promise<void> {
    const docRef = this.getDocRef(path);
    return deleteDoc(docRef);
  }

  /** Read a document or collection once */
  async getData(path: string): Promise<any> {
    const normalized = this.normalizePath(path);
    const parts = normalized.split('/').filter(Boolean);
    if (parts.length === 0) {
      return null;
    }

    if (parts.length % 2 === 0) {
      // document path
      const docRef = this.getDocRef(path);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    }

    // collection path
    const colRef = this.getCollectionRef(path);
    const querySnap = await getDocs(colRef);
    const result: { [key: string]: any } = {};
    querySnap.forEach(docSnap => {
      result[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
    });
    return result;
  }

  /** Alias for getData for backward compatibility */
  readData(path: string): Promise<any> {
    return this.getData(path);
  }

  /** Subscribe to document or collection changes and return unsubscribe */
  onValue(path: string, callback: (data: any) => void): () => void {
    const normalized = this.normalizePath(path);
    const parts = normalized.split('/').filter(Boolean);
    if (parts.length === 0) {
      throw new Error('Path cannot be empty for onValue');
    }

    if (parts.length % 2 === 0) {
      const docRef = this.getDocRef(path);
      const unsubscribe = onSnapshot(docRef, snapshot => {
        callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
      });
      return unsubscribe;
    }

    const colRef = this.getCollectionRef(path);
    const unsubscribe = onSnapshot(colRef, snapshot => {
      const data: { [key: string]: any } = {};
      snapshot.forEach(docSnap => {
        data[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
      });
      callback(data);
    });
    return unsubscribe;
  }

  /** Listen to real-time data changes at a path and return an Observable. */
  listenToData(path: string): Observable<any> {
    return new Observable(subscriber => {
      const unsubscribe = this.onValue(path, data => subscriber.next(data));
      return unsubscribe;
    });
  }

  // ─── Firebase Storage ────────────────────────────────────────────
  /**
   * Upload a File/Blob and return its download URL.
   * @param path  e.g. "destinations/my-image.jpg"
   */
  async uploadFile(path: string, file: File): Promise<string> {
    const fileRef = storageRef(this.storage, path);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  }
}
