import AsyncStorage from '@react-native-async-storage/async-storage';

import { CHAPTER_FILES, R2_BASE_URL } from '../data/r2';

/**
 * Manifest chương động.
 *
 * - Bản trong app (r2.ts) luôn có sẵn → mở app không cần mạng.
 * - `manifest.json` trên R2 (do scripts/sync-chapters.mjs upload) bổ sung chương mới
 *   mà KHÔNG cần build lại app.
 * - Bản tải về được cache trong AsyncStorage cho lần mở sau khi offline.
 */

type ChapterFiles = Record<number, number[]>;

type RemoteManifest = {
  version: 1;
  updatedAt: string;
  chapters: Record<string, number[]>;
};

const CACHE_KEY = 'manifest-cache';
const TIMEOUT_MS = 8000;

let current: ChapterFiles = { ...CHAPTER_FILES };
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;

function devLog(message: string) {
  if (__DEV__) console.log(`[manifest] ${message}`);
}

function parse(body: unknown): ChapterFiles | null {
  const data = body as RemoteManifest | null;
  if (!data || data.version !== 1 || typeof data.chapters !== 'object') return null;

  const out: ChapterFiles = {};
  for (const [key, files] of Object.entries(data.chapters)) {
    const chapter = Number(key);
    if (!Number.isInteger(chapter) || !Array.isArray(files) || files.length === 0) continue;
    if (!files.every((n) => Number.isInteger(n) && n >= 0)) continue;
    out[chapter] = files;
  }
  return Object.keys(out).length ? out : null;
}

function merge(extra: ChapterFiles) {
  const before = Object.keys(current).length;
  current = { ...current, ...extra };
  const after = Object.keys(current).length;
  if (after !== before) devLog(`+${after - before} chương`);
  listeners.forEach((fn) => fn());
}

export function getManifest(): ChapterFiles {
  return current;
}

export function getAvailableChapters(): number[] {
  return Object.keys(current)
    .map(Number)
    .sort((a, b) => a - b);
}

export function subscribeManifest(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Nạp cache + tải manifest mới nhất. Gọi nhiều lần cũng chỉ chạy một request mỗi phiên. */
export function refreshManifest(force = false): Promise<void> {
  if (inflight && !force) return inflight;

  inflight = (async () => {
    try {
      const cached = parse(JSON.parse((await AsyncStorage.getItem(CACHE_KEY)) ?? 'null'));
      if (cached) merge(cached);
    } catch {
      // cache hỏng: bỏ qua
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${R2_BASE_URL}/manifest.json?t=${Date.now()}`, {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const remote = parse(body);
      if (remote) {
        merge(remote);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(body));
      }
    } catch (err) {
      devLog(`không tải được manifest.json (${(err as Error).message}) → dùng bản trong app`);
    } finally {
      clearTimeout(timer);
    }
  })();

  return inflight;
}
