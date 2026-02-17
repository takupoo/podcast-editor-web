/**
 * IndexedDB-based cache for audio File objects (BGM, endscene).
 * Falls back silently on any error (Safari private mode, storage quota, etc.).
 *
 * DB: podcast-editor-files, version 1
 * Object store: files
 * Keys: 'bgm' | 'endscene'
 */

const DB_NAME = 'podcast-editor-files';
const DB_VERSION = 1;
const STORE_NAME = 'files';

export type FileCacheKey = 'bgm' | 'endscene';

interface CachedFileEntry {
  buffer: ArrayBuffer;
  name: string;
  type: string;
  lastModified: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export async function saveFileToCache(
  key: FileCacheKey,
  file: File
): Promise<void> {
  if (typeof indexedDB === 'undefined') return;

  try {
    const buffer = await file.arrayBuffer();
    const entry: CachedFileEntry = {
      buffer,
      name: file.name,
      type: file.type,
      lastModified: file.lastModified,
    };

    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(entry, key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { reject(tx.error); };
    });
  } catch (error) {
    console.warn(`[FileCache] Failed to save ${key} to IndexedDB:`, error);
  }
}

export async function loadFileFromCache(
  key: FileCacheKey
): Promise<File | null> {
  if (typeof indexedDB === 'undefined') return null;

  try {
    const db = await openDB();
    const entry = await new Promise<CachedFileEntry | undefined>(
      (resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).get(key);
        request.onsuccess = (event) => {
          resolve((event.target as IDBRequest<CachedFileEntry>).result);
        };
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
      }
    );

    if (!entry) return null;

    return new File([entry.buffer], entry.name, {
      type: entry.type,
      lastModified: entry.lastModified,
    });
  } catch (error) {
    console.warn(`[FileCache] Failed to load ${key} from IndexedDB:`, error);
    return null;
  }
}

export async function clearFileFromCache(
  key: FileCacheKey
): Promise<void> {
  if (typeof indexedDB === 'undefined') return;

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn(`[FileCache] Failed to clear ${key} from IndexedDB:`, error);
  }
}
