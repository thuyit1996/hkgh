/**
 * Service worker cho bản web/PWA.
 * - Ảnh chương: ưu tiên cache `chapters` (do src/api/offline.web.ts tải về), không có thì lấy mạng.
 * - Khung app (JS/CSS/font/icon cùng domain): lưu vào cache `shell-<VERSION>` để mở được khi offline.
 * - Trang HTML: lấy mạng trước, mất mạng thì trả bản đã lưu.
 */
const VERSION = 'v1';
const SHELL = `shell-${VERSION}`;
const CHAPTERS = 'chapters';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(['/', '/manifest.json', '/icons/icon-192.png']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith('shell-') && k !== SHELL).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const isImage = (url) => /\.(webp|jpe?g|png|gif)$/i.test(url.pathname);

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Ảnh truyện trên R2 (khác domain)
  if (url.origin !== self.location.origin) {
    if (!isImage(url)) return;
    event.respondWith(
      caches.open(CHAPTERS).then((cache) =>
        cache.match(request.url).then((hit) => hit || fetch(request)),
      ),
    );
    return;
  }

  // Điều hướng trang: mạng trước, offline thì trả "/" (SPA)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          if (res.ok) caches.open(SHELL).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('/'))),
    );
    return;
  }

  // File tĩnh cùng domain (tên có hash): cache trước
  event.respondWith(
    caches.open(SHELL).then((cache) =>
      cache.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          }),
      ),
    ),
  );
});
