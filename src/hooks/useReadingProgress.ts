import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { getProgress, getReadChapters, type ReadingProgress } from '../api/progress';

/** Tiến độ đọc + danh sách chương đã đọc; tự làm mới mỗi khi màn được focus lại */
export function useReadingProgress() {
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [read, setRead] = useState<Set<number>>(new Set());

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([getProgress(), getReadChapters()]).then(([p, list]) => {
        if (!alive) return;
        setProgress(p);
        setRead(new Set(list));
      });
      return () => {
        alive = false;
      };
    }, [])
  );

  return { progress, read };
}
