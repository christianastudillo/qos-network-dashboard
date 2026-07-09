import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Firestore } from 'firebase/firestore';

import { getFirebaseApp } from '../firebase';
import { AnalysisRecord } from '../models/analysis-record.model';

const COLLECTION_NAME = 'analyses';

@Injectable({
  providedIn: 'root'
})
export class AnalysisHistoryService {
  private readonly platformId = inject(PLATFORM_ID);
  private firestoreInstance: Firestore | null = null;
  private firestoreModulePromise: Promise<typeof import('firebase/firestore')> | null = null;

  private async getFirestoreModule() {
    if (!this.firestoreModulePromise) {
      this.firestoreModulePromise = import('firebase/firestore');
    }
    return this.firestoreModulePromise;
  }

  private async getFirestoreInstance(): Promise<Firestore> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Firestore solo está disponible en el navegador.');
    }
    if (!this.firestoreInstance) {
      const { getFirestore } = await this.getFirestoreModule();
      this.firestoreInstance = getFirestore(getFirebaseApp());
    }
    return this.firestoreInstance;
  }

  async saveSnapshot(record: Omit<AnalysisRecord, 'id'>): Promise<void> {
    const { collection, addDoc } = await this.getFirestoreModule();
    const db = await this.getFirestoreInstance();
    await addDoc(collection(db, COLLECTION_NAME), record);
  }

  async getHistory(uid: string): Promise<AnalysisRecord[]> {
    const { collection, query, where, orderBy, getDocs } = await this.getFirestoreModule();
    const db = await this.getFirestoreInstance();
    const q = query(
      collection(db, COLLECTION_NAME),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<AnalysisRecord, 'id'>) }));
  }

  async getById(id: string): Promise<AnalysisRecord | null> {
    const { doc, getDoc } = await this.getFirestoreModule();
    const db = await this.getFirestoreInstance();
    const snapshot = await getDoc(doc(db, COLLECTION_NAME, id));
    if (!snapshot.exists()) {
      return null;
    }
    return { id: snapshot.id, ...(snapshot.data() as Omit<AnalysisRecord, 'id'>) };
  }

  async deleteRecord(id: string): Promise<void> {
    const { doc, deleteDoc } = await this.getFirestoreModule();
    const db = await this.getFirestoreInstance();
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  }
}
