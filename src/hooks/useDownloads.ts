import { useEffect, useReducer } from 'react';

import { getDownloadState, subscribeDownloads } from '../api/offline';

/** Re-render khi trạng thái tải offline thay đổi; trả về hàm tra trạng thái theo chương */
export function useDownloads() {
  const [version, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => subscribeDownloads(bump), []);

  return { stateOf: getDownloadState, version };
}
