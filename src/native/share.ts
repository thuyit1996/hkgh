import { File, Paths } from 'expo-file-system';
import { Platform, Share } from 'react-native';

import { comic } from '../data/mock';

/** Chia sẻ một trang truyện dưới dạng ảnh (iOS); Android chia sẻ dạng chữ kèm link */
export async function sharePage(url: string, chapter: number, page: number) {
  const message = `${comic.title} — Chương ${chapter}, trang ${page}`;

  if (Platform.OS !== 'ios') {
    await Share.share({ message: `${message}\n${url}` });
    return;
  }

  let uri = url;
  if (!url.startsWith('file://')) {
    const ext = url.split('.').pop()?.split('?')[0] ?? 'jpg';
    const target = new File(Paths.cache, `share-${chapter}-${page}.${ext}`);
    const file = await File.downloadFileAsync(url, target, { idempotent: true });
    uri = file.uri;
  }
  await Share.share({ url: uri, message });
}
