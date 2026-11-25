import { getChapterImageUrl } from '../data/r2';
import { getManifest } from './manifest';

/**
 * Bản web của offline.ts: ảnh lưu trong Cache Storage (cache `chapters`), service worker
 * (public/sw.js) trả ảnh từ cache này khi <img> tải URL R2 → app vẫn dùng nguyên URL R2.
 * Danh sách chương đã tải + dung lượng lưu trong localStorage để đọc đồng bộ như bản native.
 */

export type DownloadState =
  | { status: 'queued' }
  | { status: 'downloading'; done: number; total: number }
  | { status: 'done' }
  | { status: 'error'; message: string };

const CACHE_NAME = 'chapters';
const STORE_KEY = 'offline-chapters'; // { [chapter]: bytes }

const states = new Map<number, DownloadState>();
const listeners = new Set<() => void>();
const queue: number[] = [];
let running = false;

const hasStorage = typeof window !== 'undefined' && typeof localStorage !== 'undefined';
const hasCache = typeof window !== 'undefined' && 'caches' in window;

function readStore(): Record<string, number> {
  if (!hasStorage) return {};
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

function writeStore(data: Record<string, number>) {
  if (hasStorage) localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

function emit() {
  listeners.forEach((fn) => fn());
}

function setState(chapter: number, state: DownloadState | null) {
  if (state) states.set(chapter, state);
  else states.delete(chapter);
  emit();
}

function isReady(chapter: number): boolean {
  return String(chapter) in readStore();
}

function chapterUrls(chapter: number): string[] {
  return (getManifest()[chapter] ?? []).map((n) => getChapterImageUrl(chapter, n));
}

/** Trên web ảnh offline vẫn dùng URL R2 (service worker trả từ cache) → luôn null */
export function getLocalPages(_chapter: number): string[] | null {
  return null;
}

export function getDownloadState(chapter: number): DownloadState | null {
  const live = states.get(chapter);
  if (live) return live;
  return isReady(chapter) ? { status: 'done' } : null;
}

export function getDownloadedChapters(): number[] {
  return Object.keys(readStore())
    .map(Number)
    .filter(Number.isInteger)
    .sort((a, b) => a - b);
}

export function getDownloadedSize(): number {
  return Object.values(readStore()).reduce((sum, n) => sum + (n || 0), 0);
}

export function subscribeDownloads(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Lấy ảnh có CORS (đọc được dung lượng); bucket chưa bật CORS thì lấy dạng opaque */
async function fetchImage(url: string): Promise<Response> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('HTTP')) throw err;
    return fetch(url, { mode: 'no-cors' });
  }
}

async function runQueue() {
  if (running) return;
  running = true;

  while (queue.length) {
    const chapter = queue.shift()!;
    const urls = chapterUrls(chapter);
    if (!urls.length) {
      setState(chapter, { status: 'error', message: 'Chương chưa có dữ liệu' });
      continue;
    }
    if (!hasCache) {
      setState(chapter, { status: 'error', message: 'Trình duyệt không hỗ trợ lưu offline' });
      continue;
    }

    try {
      const cache = await caches.open(CACHE_NAME);
      let bytes = 0;

      // Tải tuần tự: r2.dev giới hạn số request dồn dập
      for (let i = 0; i < urls.length; i++) {
        setState(chapter, { status: 'downloading', done: i, total: urls.length });
        const cached = await cache.match(urls[i]);
        if (cached) {
          bytes += Number(cached.headers.get('content-length') ?? 0);
          continue;
        }
        const res = await fetchImage(urls[i]);
        bytes += Number(res.headers.get('content-length') ?? 0);
        await cache.put(urls[i], res);
      }

      writeStore({ ...readStore(), [chapter]: bytes });
      setState(chapter, null);
    } catch (err) {
      setState(chapter, { status: 'error', message: (err as Error).message });
    }
  }

  running = false;
}

export function downloadChapters(chapters: number[]) {
  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    navigator.storage.persist().catch(() => undefined);
  }
  for (const chapter of chapters) {
    if (isReady(chapter) || queue.includes(chapter)) continue;
    const live = states.get(chapter);
    if (live && (live.status === 'downloading' || live.status === 'queued')) continue;
    queue.push(chapter);
    setState(chapter, { status: 'queued' });
  }
  runQueue();
}

export function removeChapter(chapter: number) {
  const urls = chapterUrls(chapter);
  const store = readStore();
  delete store[chapter];
  writeStore(store);
  setState(chapter, null);
  if (hasCache) {
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.all(urls.map((u) => cache.delete(u))))
      .catch(() => undefined);
  }
}

export function removeAllChapters() {
  writeStore({});
  states.clear();
  emit();
  if (hasCache) caches.delete(CACHE_NAME).catch(() => undefined);
}
