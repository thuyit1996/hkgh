import { useCallback, useEffect, useState } from 'react';

import { getAvailableChapters, getManifest, refreshManifest, subscribeManifest } from '../api/manifest';
import { chapters as knownChapters } from '../data/mock';

export type ChapterItem = {
  id: string;
  index: number;
  /** Tên chương nếu biết; null → chỉ hiển thị số chương */
  title: string | null;
  pages: number;
};

function buildItems(): ChapterItem[] {
  const manifest = getManifest();
  return getAvailableChapters().map((chapter) => ({
    id: `ch-${chapter}`,
    index: chapter,
    title: knownChapters.find((known) => known.index === chapter)?.title ?? null,
    pages: manifest[chapter].length,
  }));
}

/**
 * Danh sách chương: có ngay từ manifest trong app, tự cập nhật khi manifest.json
 * trên R2 có thêm chương mới.
 */
export function useChapters() {
  const [items, setItems] = useState<ChapterItem[]>(buildItems);

  useEffect(() => {
    const unsubscribe = subscribeManifest(() => setItems(buildItems()));
    refreshManifest();
    return unsubscribe;
  }, []);

  const reload = useCallback(() => {
    refreshManifest(true);
  }, []);

  return { items, loading: false, error: null as string | null, reload };
}
