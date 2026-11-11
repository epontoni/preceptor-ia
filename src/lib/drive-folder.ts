// src/lib/drive-folder.ts
// Guarda los PDFs generados en una carpeta local elegida por el usuario (ej. carpeta de
// Google Drive para escritorio). Usa la File System Access API (Chrome / Edge) y recuerda
// la carpeta elegida en IndexedDB. Todo ocurre en el navegador, por lo que funciona aunque
// el servidor esté en otra máquina.

const DB_NAME = 'preceptor-ia';
const STORE = 'handles';
const KEY = 'drive-folder';

export function isFolderSaveSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE).objectStore(STORE).get(KEY);
    r.onsuccess = () => resolve(r.result as T | undefined);
    r.onerror = () => reject(r.error);
  });
}

async function idbSet(value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Devuelve la carpeta guardada (si existe). No pide permisos. */
export async function getSavedFolderName(): Promise<string | null> {
  if (!isFolderSaveSupported()) return null;
  try {
    const handle = await idbGet<any>();
    return handle?.name ?? null;
  } catch {
    return null;
  }
}

/** Abre el selector de carpeta y la recuerda. */
export async function chooseFolder(): Promise<string> {
  const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite', id: 'preceptor-drive' });
  await idbSet(handle);
  return handle.name;
}

async function getWritableFolder(): Promise<any | null> {
  const handle = await idbGet<any>();
  if (!handle) return null;
  const opts = { mode: 'readwrite' };
  if ((await handle.queryPermission(opts)) === 'granted') return handle;
  if ((await handle.requestPermission(opts)) === 'granted') return handle;
  return null;
}

export interface SaveItem {
  url: string;
  fileName: string;
  /** Si es true, un 404 (ej. alumno sin firma) se omite en vez de fallar. */
  optional?: boolean;
}

/**
 * Descarga cada archivo (PDF o firma PNG) y lo escribe en <carpeta>/<subfolder>/<fileName>.
 * Devuelve la cantidad de archivos guardados.
 */
export async function savePdfsToFolder(items: SaveItem[], subfolder: string): Promise<number> {
  const root = await getWritableFolder();
  if (!root) throw new Error('No hay carpeta seleccionada o falta el permiso de escritura.');
  const dir = await root.getDirectoryHandle(subfolder, { create: true });
  let saved = 0;
  for (const item of items) {
    const res = await fetch(`${item.url}${item.url.includes('?') ? '&' : '?'}t=${Date.now()}`);
    if (!res.ok) {
      if (item.optional && res.status === 404) continue;
      throw new Error(`No se pudo obtener ${item.fileName}`);
    }
    const blob = await res.blob();
    const file = await dir.getFileHandle(item.fileName, { create: true });
    const writable = await file.createWritable();
    await writable.write(blob);
    await writable.close();
    saved++;
  }
  return saved;
}

