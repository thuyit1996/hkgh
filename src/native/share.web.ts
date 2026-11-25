import { comic } from '../data/mock';

/** Bản web: Web Share API (Safari iOS có), không có thì copy link vào clipboard */
export async function sharePage(url: string, chapter: number, page: number) {
  const text = `${comic.title} — Chương ${chapter}, trang ${page}`;

  if (navigator.share) {
    try {
      // Thử chia sẻ dạng ảnh (cần R2 bật CORS), lỗi thì chia sẻ link
      const res = await fetch(url, { mode: 'cors' });
      const blob = await res.blob();
      const file = new File([blob], url.split('/').pop() ?? 'page.jpg', { type: blob.type });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }
    try {
      await navigator.share({ text, url });
    } catch {
      // người dùng huỷ
    }
    return;
  }

  await navigator.clipboard?.writeText(`${text}\n${url}`).catch(() => undefined);
  window.alert('Đã copy link trang vào clipboard');
}
