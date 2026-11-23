import { getChapterImageUrl } from '../data/r2';
import { getAvailableChapters, getManifest } from './manifest';
import { getLocalPages } from './offline';

/** Tỉ lệ cao/rộng phổ biến của trang (ảnh thật dao động 1.33–1.45) */
const PAGE_ASPECT = 1.445;

export type ChapterPage = {
  index: number;
  url: string;
};

export type ChapterPayload = {
  chapter: number;
  pageCount: number;
  aspectRatio: number;
  pages: ChapterPage[];
  /** Ảnh đọc từ bộ nhớ máy (đã tải offline) */
  offline: boolean;
};

export type ChapterSummary = {
  chapter: number;
  pages: number;
};

function devLog(message: string) {
  if (__DEV__) console.log(`[api] ${message}`);
}

/** Danh sách chương có ảnh (manifest trong app + manifest.json trên R2) */
export async function getChapters(_signal?: AbortSignal): Promise<ChapterSummary[]> {
  const manifest = getManifest();
  return getAvailableChapters().map((chapter) => ({
    chapter,
    pages: manifest[chapter].length,
  }));
}

/** URL ảnh của một chương: ưu tiên bản đã tải về máy, không có thì trỏ thẳng vào R2 */
export async function getChapterPages(
  chapter: number,
  _signal?: AbortSignal
): Promise<ChapterPayload> {
  const local = getLocalPages(chapter);
  const urls = local ?? (getManifest()[chapter] ?? []).map((n) => getChapterImageUrl(chapter, n));

  if (urls.length === 0) {
    devLog(`✖ chương ${chapter} chưa có trên R2`);
    throw new Error(`Chương ${chapter} chưa có dữ liệu`);
  }

  return {
    chapter,
    pageCount: urls.length,
    aspectRatio: PAGE_ASPECT,
    pages: urls.map((url, i) => ({ index: i + 1, url })),
    offline: !!local,
  };
}
