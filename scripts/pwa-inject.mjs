/**
 * Chạy sau `expo export -p web`: chèn thẻ PWA (manifest, icon iOS, đăng ký service worker)
 * vào mọi file HTML trong dist/. Không dùng src/app/+html.tsx vì Expo 58 bỏ mất thẻ JS/CSS
 * khi có file đó.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';

const head = `
<meta name="theme-color" content="#F3EFE6">
<link rel="manifest" href="/manifest.json">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="HKGH">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<style>body{background-color:#F3EFE6;overscroll-behavior:none}*{-webkit-tap-highlight-color:transparent}</style>
<script>
if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  addEventListener('load', function () { navigator.serviceWorker.register('/sw.js'); });
}
</script>
`;

let count = 0;
for (const name of readdirSync(DIST)) {
  if (!name.endsWith('.html')) continue;
  const file = join(DIST, name);
  let html = readFileSync(file, 'utf8');
  if (html.includes('rel="manifest"')) continue;
  html = html
    .replace(/<html lang="[^"]*"/, '<html lang="vi"')
    .replace(
      /<meta name="viewport" content="[^"]*"\s*\/?>/,
      '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">',
    )
    .replace('</head>', `${head}</head>`);
  writeFileSync(file, html);
  count++;
}
console.log(`pwa-inject: đã chèn thẻ PWA vào ${count} file HTML`);
