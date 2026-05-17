import { SavedRoute, RouteMetadata, Store } from '../types';
import { ensureToken, clearToken, getAccessToken } from './auth';

const STORE_KEY = 'hike_routes_v1';

// ---------- localStorage backend ----------
export const localStore: Store = {
  async list(): Promise<RouteMetadata[]> {
    try {
      const arr = JSON.parse(localStorage.getItem(STORE_KEY) || '[]') as SavedRoute[];
      return arr.map((r) => ({ id: r.id, name: r.name, created: r.created }));
    } catch {
      return [];
    }
  },

  async get(id: string): Promise<SavedRoute | null> {
    try {
      const arr = JSON.parse(localStorage.getItem(STORE_KEY) || '[]') as SavedRoute[];
      return arr.find((r) => r.id === id) || null;
    } catch {
      return null;
    }
  },

  async save(payload: SavedRoute): Promise<string> {
    try {
      const arr = JSON.parse(localStorage.getItem(STORE_KEY) || '[]') as SavedRoute[];
      arr.push(payload);
      localStorage.setItem(STORE_KEY, JSON.stringify(arr));
      return payload.id;
    } catch (e) {
      throw new Error(`Failed to save to localStorage: ${e}`);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const arr = JSON.parse(localStorage.getItem(STORE_KEY) || '[]') as SavedRoute[];
      const filtered = arr.filter((r) => r.id !== id);
      localStorage.setItem(STORE_KEY, JSON.stringify(filtered));
    } catch (e) {
      throw new Error(`Failed to delete from localStorage: ${e}`);
    }
  },

  async clear(): Promise<void> {
    localStorage.removeItem(STORE_KEY);
  },
};

// ---------- Google Drive backend ----------
interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  appProperties?: {
    created?: string;
  };
}

interface DriveListResponse {
  files?: DriveFile[];
}

async function driveRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await ensureToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };
  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    clearToken();
    throw new Error('Authorization expired, please sign in again');
  }
  if (!response.ok) {
    throw new Error(`Drive API error: ${response.status}`);
  }
  return response;
}

async function driveListRoutes(): Promise<RouteMetadata[]> {
  const response = await driveRequest(
    'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name,modifiedTime,appProperties)&pageSize=100'
  );
  const data: DriveListResponse = await response.json();
  return (data.files || []).map((f) => ({
    id: f.id,
    name: f.name.replace(/\.json$/, ''),
    created: f.appProperties?.created || f.modifiedTime,
  }));
}

async function driveGetRoute(id: string): Promise<SavedRoute> {
  const response = await driveRequest(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`);
  return await response.json();
}

async function driveSaveRoute(payload: SavedRoute): Promise<string> {
  const boundary = '-------' + Date.now();
  const metadata = {
    name: payload.name + '.json',
    parents: ['appDataFolder'],
    mimeType: 'application/json',
    appProperties: { created: payload.created },
  };
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    JSON.stringify(payload),
    `--${boundary}--`,
  ].join('\r\n');

  const response = await driveRequest(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    }
  );
  const result: { id: string } = await response.json();
  return result.id;
}

async function driveDeleteRoute(id: string): Promise<void> {
  await driveRequest(`https://www.googleapis.com/drive/v3/files/${id}`, {
    method: 'DELETE',
  });
}

export const driveStore: Store = {
  list: driveListRoutes,
  get: driveGetRoute,
  save: driveSaveRoute,
  delete: driveDeleteRoute,
};

// ---------- Store selector ----------
export function getStore(): Store {
  return getAccessToken() ? driveStore : localStore;
}

// ---------- Migration ----------
export async function checkMigration(): Promise<void> {
  if (!getAccessToken()) return;

  const localRoutes = await localStore.list();
  if (localRoutes.length === 0) return;

  const driveRoutes = await driveStore.list();
  if (driveRoutes.length > 0) return;

  const msg = `Upload ${localRoutes.length} local route${localRoutes.length > 1 ? 's' : ''} to Google Drive?`;
  if (!confirm(msg)) return;

  for (const meta of localRoutes) {
    const full = await localStore.get(meta.id);
    if (full) {
      await driveStore.save(full);
    }
  }
  await localStore.clear?.();
}
