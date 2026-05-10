
import { storageService } from './storageService';
import { firebaseService } from './firebaseService';

/**
 * Offline Storage Service for Strict Document Verification
 * Uses IndexedDB to store blobs and metadata locally.
 */

const DB_NAME = 'AutoAdsOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

export interface DocMeta {
  rc: 'pending' | 'uploaded';
  dl: 'pending' | 'uploaded';
  aadhar: 'pending' | 'uploaded';
  selfie: 'pending' | 'uploaded';
  pan?: 'pending' | 'uploaded';
  insurance?: 'pending' | 'uploaded';
  synced: boolean;
  syncing?: boolean;
  urls?: {
    rc?: string;
    dl?: string;
    aadhar?: string;
    selfie?: string;
    pan?: string;
    insurance?: string;
  };
  updatedAt: number;
}

export const offlineStorageService = {
  db: null as IDBDatabase | null,

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async saveDocument(uid: string, type: DocId, blob: Blob): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const key = `drivers/${uid}/${type}.jpg`;
      store.put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getDocument(uid: string, type: DocId): Promise<string | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const key = `drivers/${uid}/${type}.jpg`;
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result) {
          resolve(URL.createObjectURL(request.result));
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  async updateMeta(uid: string, updates: Partial<DocMeta>): Promise<DocMeta> {
    const db = await this.init();
    const current = await this.getMeta(uid);
    const updated: DocMeta = {
      ...current,
      ...updates,
      updatedAt: Date.now()
    };
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const key = `drivers/${uid}/meta.json`;
      store.put(updated, key);
      tx.oncomplete = () => resolve(updated);
      tx.onerror = () => reject(tx.error);
    });
  },

  async getMeta(uid: string): Promise<DocMeta> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const key = `drivers/${uid}/meta.json`;
      const request = store.get(key);
      request.onsuccess = () => {
        resolve(request.result || {
          rc: 'pending',
          dl: 'pending',
          aadhar: 'pending',
          selfie: 'pending',
          synced: false,
          updatedAt: 0
        });
      };
      request.onerror = () => reject(request.error);
    });
  },

  async getDocumentBlob(uid: string, type: DocId): Promise<Blob | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const key = `drivers/${uid}/${type}.jpg`;
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  async syncDocuments(uid: string): Promise<boolean> {
    const meta = await this.getMeta(uid);
    if (meta.synced || meta.syncing) return true;
    
    // Check if offline status (basic)
    if (!navigator.onLine) {
      console.log("[Sync] Device offline, skipping sync.");
      return false;
    }

    // Check if all primary uploaded locally
    const isReady = meta.rc === 'uploaded' && meta.dl === 'uploaded' && meta.aadhar === 'uploaded' && meta.selfie === 'uploaded';
    if (!isReady) return false;

    await this.updateMeta(uid, { syncing: true });

    try {
      console.log(`[Sync] Starting cloud synchronization for driver ${uid}...`);
      const types: DocId[] = ['rc', 'dl', 'aadhar', 'selfie', 'pan', 'insurance'];
      const urls: any = { ...meta.urls };

      for (const t of types) {
        // Skip if already has a URL
        if (urls[t]) continue;

        const blob = await this.getDocumentBlob(uid, t);
        if (blob) {
          const file = new File([blob], `${t}.jpg`, { type: 'image/jpeg' });
          const path = storageService.getDriverDocPath(uid, t as any, `${t}.jpg`);
          const url = await storageService.uploadFile(path, file);
          urls[t] = url;
          console.log(`[Sync] Uploaded ${t} to ${url}`);
        }
      }

      // Update Firebase Profile with these URLs
      await firebaseService.updateDriverProfile(uid, {
        profileImage: urls.selfie,
        aadharPhoto: urls.aadhar,
        rcPhoto: urls.rc,
        dlPhoto: urls.dl,
        panPhoto: urls.pan,
        insurancePhoto: urls.insurance,
        isVerified: false,
        status: 'pending_verification'
      });

      await this.updateMeta(uid, { 
        synced: true, 
        syncing: false,
        urls 
      });
      console.log("[Sync] Cloud synchronization complete.");
      return true;
    } catch (err) {
      console.error("[Sync] Error during cloud sync:", err);
      await this.updateMeta(uid, { syncing: false });
      return false;
    }
  }
};

type DocId = 'rc' | 'dl' | 'aadhar' | 'selfie' | 'pan' | 'insurance';
