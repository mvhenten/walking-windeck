const GIS_CLIENT_ID = '740964302491-053r5inogfui83368ftrmh1fqo2ph171.apps.googleusercontent.com';
const GIS_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const TOKEN_KEY = 'gis_token';
const TOKEN_EXPIRY_KEY = 'gis_token_expiry';

interface TokenResponse {
  access_token: string;
  expires_in?: number;
  error?: string;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
          }) => {
            requestAccessToken: (options: { prompt: string }) => void;
          };
        };
      };
    };
  }
}

let gisLoaded = false;
let tokenClient: {
  requestAccessToken: (options: { prompt: string }) => void;
} | null = null;
let accessToken: string | null = null;

export function loadGIS(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.google?.accounts?.oauth2) {
      gisLoaded = true;
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      gisLoaded = true;
      resolve(true);
    };
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

function getStoredToken(): string | null {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
    if (token && expiry && Date.now() < parseInt(expiry, 10)) {
      return token;
    }
  } catch {
    // Ignore
  }
  return null;
}

function storeToken(token: string, expiresIn: number): void {
  try {
    const expiry = Date.now() + expiresIn * 1000;
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
  } catch {
    // Ignore
  }
}

export function clearToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch {
    // Ignore
  }
  accessToken = null;
}

function requestToken(silent = false): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services not loaded'));
      return;
    }

    if (!tokenClient) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GIS_CLIENT_ID,
        scope: GIS_SCOPE,
        callback: (response: TokenResponse) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          accessToken = response.access_token;
          storeToken(accessToken, response.expires_in || 3600);
          resolve(accessToken);
        },
      });
    }
    tokenClient.requestAccessToken({ prompt: silent ? '' : 'consent' });
  });
}

export async function ensureToken(): Promise<string> {
  if (accessToken) return accessToken;

  const stored = getStoredToken();
  if (stored) {
    accessToken = stored;
    return accessToken;
  }

  try {
    return await requestToken(true);
  } catch {
    return await requestToken(false);
  }
}

export function isAuthenticated(): boolean {
  return accessToken !== null || getStoredToken() !== null;
}

export async function initAuth(): Promise<void> {
  await loadGIS();
  const stored = getStoredToken();
  if (stored) {
    accessToken = stored;
  }
}

export function getAccessToken(): string | null {
  return accessToken || getStoredToken();
}

export { gisLoaded };
