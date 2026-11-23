import { Directory, File, Paths } from 'expo-file-system';

import { getChapterImageUrl } from '../data/r2';
import { getManifest } from './manifest';

/**
 * Tải chương về máy để đọc offline.
 * Mỗi chương một thư mục documents/chapters/<số>/, có file `done` đánh dấu đã tải đủ.
 * Tải tuần tự từng ảnh: r2.dev giới hạn số request dồn dập.
 */

export type DownloadState =
  | { status: 'queued' }
  | { status: 'downloading'; done: number; total: number }
  | { status: 'done' }
  | { status: 'error'; message: string };

const root = () => new Directory(Paths.document, 'chapters');
const chapterDir = (chapter: number) => new Directory(Paths.document, 'chapters', String(chapter));
const marker = (chapter: number) => new File(chapterDir(chapter), 'done');

const states = new Map<number, DownloadState>();
const listeners = new Set<() => void>();
const queue: number[] = [];
let running = false;

function emit() {
  listeners.forEach((fn) => fn());
}

function setState(chapter: number, state: DownloadState | null) {
  if (state) states.set(chapter, state);
  else states.delete(chapter);
  emit();
}

function fileName(url: string) {
  return url.split('/').pop() ?? 'page';
}

function isReady(chapter: number): boolean {
  try {
    return marker(chapter).exists;
  } catch {
    return false;
  }
}

/** Danh sách URI ảnh trên máy nếu chương đã tải đủ, ngược lại null */
export function getLocalPages(chapter: number): string[] | null {
  if (!isReady(chapter)) return null;
  const files = getManifest()[chapter] ?? [];
  const dir = chapterDir(chapter);
  const uris = files.map((n) => new File(dir, fileName(getChapterImageUrl(chapter, n))));
  return uris.every((f) => f.exists) ? uris.map((f) => f.uri) : null;
}

export function getDownloadState(chapter: number): DownloadState | null {
  const live = states.get(chapter);
  if (live) return live;
  return isReady(chapter) ? { status: 'done' } : null;
}

export function getDownloadedChapters(): number[] {
  try {
    const dir = root();
    if (!dir.exists) return [];
    return dir
      .list()
      .filter((entry): entry is Directory => entry instanceof Directory)
      .map((entry) => Number(entry.uri.replace(/\/$/, '').split('/').pop()))
      .filter((n) => Number.isInteger(n) && isReady(n))
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}

/** Tổng dung lượng đã tải (byte) */
export function getDownloadedSize(): number {
  try {
    const dir = root();
    return dir.exists ? (dir.size ?? 0) : 0;
  } catch {
    return 0;
  }
}

export function subscribeDownloads(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function runQueue() {
  if (running) return;
  running = true;

  while (queue.length) {
    const chapter = queue.shift()!;
    const files = getManifest()[chapter] ?? [];
    if (!files.length) {
      setState(chapter, { status: 'error', message: 'Chương chưa có dữ liệu' });
      continue;
    }

    try {
      const dir = chapterDir(chapter);
      dir.create({ intermediates: true, idempotent: true });

      for (let i = 0; i < files.length; i++) {
        setState(chapter, { status: 'downloading', done: i, total: files.length });
        const url = getChapterImageUrl(chapter, files[i]);
        const target = new File(dir, fileName(url));
        if (!target.exists || (target.size ?? 0) < 1024) {
          await File.downloadFileAsync(url, target, { idempotent: true });
        }
      }

      await marker(chapter).write('1');
      setState(chapter, null);
      emit();
    } catch (err) {
      setState(chapter, { status: 'error', message: (err as Error).message });
    }
  }

  running = false;
}

/** Thêm chương vào hàng đợi tải (bỏ qua chương đã tải / đang chờ) */
export function downloadChapters(chapters: number[]) {
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
  try {
    const dir = chapterDir(chapter);
    if (dir.exists) dir.delete();
  } catch {
    // bỏ qua
  }
  setState(chapter, null);
}

export function removeAllChapters() {
  try {
    const dir = root();
    if (dir.exists) dir.delete();
  } catch {
    // bỏ qua
  }
  states.clear();
  emit();
}
