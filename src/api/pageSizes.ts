import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Tỉ lệ cao/rộng thật của từng trang ("<chương>:<trang>" → h/w), lưu trên máy.
 * Trang thường ~1.44, nhưng có chương nguồn ghép cả chương thành một ảnh dài (tỉ lệ 30+),
 * nên reader phải biết đúng tỉ lệ để hiển thị đủ chiều cao và nhảy đúng trang khi đọc tiếp.
 */

const KEY = 'page-ratios';

let cache: Record<string, number> = {};
let loaded: Promise<void> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function pageKey(chapter: number, page: number) {
  return `${chapter}:${page}`;
}

/** Nạp cache từ máy (chỉ đọc AsyncStorage một lần) */
export function loadPageRatios(): Promise<void> {
  if (!loaded) {
    loaded = AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) cache = { ...(JSON.parse(raw) as Record<string, number>), ...cache };
      })
      .catch(() => undefined);
  }
  return loaded;
}

export function getPageRatios(chapter: number, pageCount: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (let page = 1; page <= pageCount; page++) {
    const key = pageKey(chapter, page);
    if (cache[key]) out[key] = cache[key];
  }
  return out;
}

export function setPageRatio(key: string, ratio: number) {
  if (!Number.isFinite(ratio) || ratio <= 0) return;
  if (cache[key] && Math.abs(cache[key] - ratio) < 0.001) return;
  cache[key] = ratio;
  // Gom nhiều trang tải xong cùng lúc thành một lần ghi
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(cache)).catch(() => undefined);
  }, 1000);
}
