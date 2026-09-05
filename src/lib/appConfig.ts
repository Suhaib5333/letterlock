import { useEffect, useState } from 'react';
import { devSeamValue } from './devSeams';

/**
 * Remote app configuration (LAUNCH_PLAN Phase 1 "Version gate" + Phase 6b funnel):
 * `GET ${VITE_API_URL}/app-config`. Skipped entirely when VITE_API_URL is unset,
 * cached in localStorage, 5 s timeout, and NEVER awaited by rendering: the UI
 * starts from the cached copy (or nothing) and re-renders when the fetch lands.
 */
export interface AppConfig {
  /** Minimum native shell version still allowed (checked by the Capacitor app). */
  minNative?: string;
  /** Minimum web-bundle version; below it the app shows "Update required". */
  minBundle?: string;
  maintenance?: boolean;
  message?: string;
  storeLinks?: { ios?: string; android?: string };
  /** Newest OTA web bundle (Phase 3c); null/absent = nothing published. */
  latestBundle?: LatestBundle | null;
}

/** Published by .github/workflows/ota-release.yml, consumed by lib/ota.ts. */
export interface LatestBundle {
  version: string;
  url: string;
  sha256: string;
  minNative?: string;
}

/** Injected from package.json `version` by vite `define` (see vite.config.ts). */
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';

const KEY = 'letterlock.appConfig';
const TIMEOUT_MS = 5000;

/** API base URL: VITE_API_URL, or the local-only `?__apiurl=` test seam. */
export function apiBase(): string | null {
  const env = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  const seam = devSeamValue('__apiurl');
  const base = env || seam;
  return base ? base.replace(/\/+$/, '') : null;
}

export function readCachedConfig(): AppConfig | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AppConfig) : null;
  } catch {
    return null;
  }
}

function writeCache(cfg: AppConfig): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
}

/** Fetch + cache. Resolves null when unconfigured, offline, slow or malformed. */
export async function fetchAppConfig(): Promise<AppConfig | null> {
  const base = apiBase();
  if (!base) return null;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/app-config`, { signal: ctl.signal, cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json()) as unknown;
    if (!json || typeof json !== 'object') return null;
    const cfg = json as AppConfig;
    writeCache(cfg);
    return cfg;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** "1.2.10" vs "1.2.9" → 1; equal → 0; missing parts count as 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

/** True when the server's `minBundle` is newer than this build. */
export function updateRequired(cfg: AppConfig | null, version: string = APP_VERSION): boolean {
  return !!cfg?.minBundle && compareVersions(cfg.minBundle, version) > 0;
}

// One fetch per page load, shared by every hook instance.
let inflight: Promise<AppConfig | null> | null = null;
const listeners = new Set<(cfg: AppConfig | null) => void>();
let current: AppConfig | null | undefined;

function ensureFetched(): void {
  if (inflight) return;
  inflight = fetchAppConfig().then((cfg) => {
    if (cfg) {
      current = cfg;
      for (const l of listeners) l(cfg);
    }
    return cfg;
  });
}

/** Hook: cached config immediately (or null), then the live copy once fetched. */
export function useAppConfig(): AppConfig | null {
  const [cfg, setCfg] = useState<AppConfig | null>(() => {
    if (current === undefined) current = apiBase() ? readCachedConfig() : null;
    return current;
  });
  useEffect(() => {
    if (!apiBase()) return;
    listeners.add(setCfg);
    ensureFetched();
    return () => {
      listeners.delete(setCfg);
    };
  }, []);
  return cfg;
}
