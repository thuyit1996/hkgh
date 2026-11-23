#!/usr/bin/env node
/**
 * Tải ảnh chương từ truyenqq và upload lên Cloudflare R2, rồi cập nhật src/data/r2.ts.
 *
 *   node scripts/sync-chapters.mjs 521            # một chương
 *   node scripts/sync-chapters.mjs 521 530        # dải chương (dừng sớm nếu chương chưa ra)
 *   node scripts/sync-chapters.mjs 521 --dry      # chỉ tải về máy, không upload
 *   node scripts/sync-chapters.mjs --next         # tiếp nối từ chương mới nhất trong r2.ts
 *   node scripts/sync-chapters.mjs --sync-manifest # cập nhật r2.ts theo các folder trong .downloads
 *   node scripts/sync-chapters.mjs --publish-manifest # chỉ upload manifest.json lên R2
 *
 * Sau mỗi lần upload chương, manifest.json (danh sách chương + số file) được đẩy lên R2:
 * app đọc file này khi mở nên thấy chương mới ngay, KHÔNG cần build lại.
 *
 * Cần Node >= 18 và file .env ở gốc project:
 *   R2_ACCOUNT_ID=...  R2_ACCESS_KEY_ID=...  R2_SECRET_ACCESS_KEY=...  R2_BUCKET=...
 */
import { createHash, createHmac } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, 'src/data/r2.ts');
const DOWNLOAD_DIR = join(ROOT, '.downloads');

const SITE = 'https://www.truyenqq.ca';
const SERIES_PATH = '/truyen-tranh/hiep-khach-giang-ho';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const DELAY_MS = 400; // nghỉ giữa các ảnh để không dồn tải lên trang nguồn
const MAX_CHAPTERS_PER_RUN = 30;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Tham số dòng lệnh ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const nums = args.filter((a) => /^\d+$/.test(a)).map(Number);

if (Number(process.versions.node.split('.')[0]) < 18) {
  console.error(`Cần Node >= 18 (đang dùng ${process.version}). Chạy "nvm use" trước.`);
  process.exit(1);
}

// ── .env ─────────────────────────────────────────────────────────────────────
function loadEnv() {
  const file = join(ROOT, '.env');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv();

const env = {
  account: process.env.R2_ACCOUNT_ID,
  key: process.env.R2_ACCESS_KEY_ID,
  secret: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET,
};
if (!dry && !args.includes('--sync-manifest') && (!env.account || !env.key || !env.secret || !env.bucket)) {
  console.error('Thiếu R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET trong .env');
  process.exit(1);
}

// ── Manifest r2.ts ───────────────────────────────────────────────────────────
function manifestChapters() {
  const src = readFileSync(MANIFEST, 'utf8');
  return [...src.matchAll(/^\s*(\d+):/gm)].map((m) => Number(m[1]));
}

/** Biểu thức gọn cho danh sách số file: range(a, b) hoặc without(range(a, b), ...) */
function filesExpr(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const gaps = [];
  for (let n = first; n <= last; n++) if (!sorted.includes(n)) gaps.push(n);
  return gaps.length ? `without(range(${first}, ${last}), ${gaps.join(', ')})` : `range(${first}, ${last})`;
}

function addToManifest(chapter, pageCountOrNumbers) {
  let src = readFileSync(MANIFEST, 'utf8');
  const numbers = Array.isArray(pageCountOrNumbers)
    ? pageCountOrNumbers
    : Array.from({ length: pageCountOrNumbers }, (_, i) => i + 1);
  const line = `  ${chapter}: ${filesExpr(numbers)},`;
  const existing = new RegExp(`^\\s*${chapter}:.*$`, 'm');

  if (existing.test(src)) {
    src = src.replace(existing, line);
  } else {
    // chèn trước dấu đóng của CHAPTER_FILES, giữ thứ tự tăng dần
    const block = src.match(/CHAPTER_FILES[^{]*\{([\s\S]*?)\n\};/);
    if (!block) throw new Error('Không tìm thấy CHAPTER_FILES trong r2.ts');
    const lines = block[1].split('\n').filter((l) => l.trim());
    lines.push(line);
    lines.sort((a, b) => Number(a.match(/(\d+):/)?.[1] ?? 0) - Number(b.match(/(\d+):/)?.[1] ?? 0));
    src = src.replace(block[0], block[0].replace(block[1], '\n' + lines.join('\n')));
    src = src.replace(/\n\};\nexport const AVAILABLE_CHAPTERS/, '\n};\n\nexport const AVAILABLE_CHAPTERS');
  }
  writeFileSync(MANIFEST, src);
}

/** Đọc CHAPTER_FILES trong r2.ts → { chương: [số file] } (hiểu range(a, b) và without(range(a, b), ...)) */
function manifestToJson() {
  const src = readFileSync(MANIFEST, 'utf8');
  const chapters = {};
  const re = /^\s*(\d+):\s*(?:without\(\s*)?range\((\d+),\s*(\d+)\)((?:,\s*\d+)*)\)?,?\s*$/gm;
  for (const m of src.matchAll(re)) {
    const [, ch, a, b, gapsRaw] = m;
    const gaps = (gapsRaw.match(/\d+/g) ?? []).map(Number);
    const files = [];
    for (let n = Number(a); n <= Number(b); n++) if (!gaps.includes(n)) files.push(n);
    chapters[ch] = files;
  }
  return { version: 1, updatedAt: new Date().toISOString(), chapters };
}

async function publishManifest() {
  const body = manifestToJson();
  const count = Object.keys(body.chapters).length;
  if (!count) throw new Error('Không đọc được chương nào từ r2.ts');
  await putObject('manifest.json', Buffer.from(JSON.stringify(body)), 'application/json');
  console.log(`• Đã upload manifest.json (${count} chương)`);
}

// ── Trang nguồn ──────────────────────────────────────────────────────────────
async function fetchChapter(chapter) {
  const url = `${SITE}${SERIES_PATH}/chuong-${chapter}`;
  // Thử lại vài lần: trang nguồn đôi khi lỗi tạm thời
  let html = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
      if (res.status === 404) return null;
      if (res.ok) {
        html = await res.text();
        if (html.includes('/upload/chaps/')) break;
      }
    } catch {
      // lỗi mạng → thử lại
    }
    await sleep(2000 * attempt);
  }

  // Hai kiểu link ảnh: /upload/chaps/<id>/001.jpg (chương cũ)
  // và /image.php?url=https://<cdn>/<truyện>/<chương>/0.jpg (chương mới, phải đi qua proxy của trang)
  const images = [
    ...html.matchAll(/<img[^>]+src="(\/upload\/chaps\/[^"?]+)[^"]*"/g),
    ...html.matchAll(/<img[^>]+src="(\/image\.php\?url=[^"]+)"/g),
  ].map((m) => SITE + m[1].replace(/&amp;/g, '&'));
  if (images.length === 0) return null;

  // Chỉ giữ ảnh trong thư mục chương chiếm đa số (/upload/chaps/<id>/), bỏ ảnh lạc
  const folderOf = (u) => u.split('?url=').pop().split('?')[0].split('/').slice(-2, -1)[0];
  const counts = {};
  images.forEach((u) => (counts[folderOf(u)] = (counts[folderOf(u)] || 0) + 1));
  const mainFolder = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  const pageImages = images.filter((u) => folderOf(u) === mainFolder);

  // Còn chương sau nếu trang có nút "chương sau" (có thể trỏ tới chương phụ như chuong-548-1)
  const hasNext =
    html.includes(`${SERIES_PATH}/chuong-${chapter + 1}"`) ||
    new RegExp(`btn-primary"[^>]*href="${SERIES_PATH}/chuong-${chapter}-\\d+"`).test(html);
  return { url, images: [...new Set(pageImages)], hasNext };
}

async function download(url, referer) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Referer: referer },
        signal: AbortSignal.timeout(30000),
      });
      if (res.status === 404) return null; // ảnh hỏng ngay trên trang nguồn
      const type = res.headers.get('content-type') || '';
      if (res.ok && !type.startsWith('image/')) return null; // link không phải ảnh truyện
      if (res.ok) {
        const body = Buffer.from(await res.arrayBuffer());
        if (body.length < 2048) return null; // ảnh rỗng/hỏng trên trang nguồn (200 nhưng 0 byte)
        return {
          body,
          type: res.headers.get('content-type') || 'image/jpeg',
        };
      }
    } catch {
      // mất kết nối / "terminated" / timeout → thử lại
    }
    await sleep(2000 * attempt);
  }
  throw new Error(`Tải ảnh thất bại: ${url}`);
}

// ── Upload R2 (S3 API, chữ ký SigV4) ─────────────────────────────────────────
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => createHmac('sha256', key).update(data).digest();

async function putObject(key, body, contentType) {
  const host = `${env.account}.r2.cloudflarestorage.com`;
  const path = `/${env.bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = amzDate.slice(0, 8);
  const payloadHash = sha256(body);

  const headers = {
    'content-type': contentType,
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  const signedHeaders = Object.keys(headers).sort().join(';');
  const canonical = [
    'PUT',
    path,
    '',
    ...Object.keys(headers).sort().map((h) => `${h}:${headers[h]}`),
    '',
    signedHeaders,
    payloadHash,
  ].join('\n');

  const scope = `${date}/auto/s3/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
  const kSigning = hmac(hmac(hmac(hmac(`AWS4${env.secret}`, date), 'auto'), 's3'), 'aws4_request');
  const signature = createHmac('sha256', kSigning).update(toSign).digest('hex');

  const res = await fetch(`https://${host}${path}`, {
    method: 'PUT',
    headers: {
      ...headers,
      Authorization: `AWS4-HMAC-SHA256 Credential=${env.key}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body,
  });
  if (!res.ok) throw new Error(`Upload ${key} lỗi ${res.status}: ${await res.text()}`);
}

// ── Chạy ─────────────────────────────────────────────────────────────────────
async function syncChapter(chapter) {
  if (chapter < 510) throw new Error('Script chỉ hỗ trợ chương >= 510 (định dạng 001.jpg)');

  const info = await fetchChapter(chapter);
  if (!info) {
    console.log(`• Chương ${chapter}: chưa có trên trang nguồn → dừng.`);
    return null;
  }
  console.log(`• Chương ${chapter}: ${info.images.length} ảnh`);

  const localDir = join(DOWNLOAD_DIR, String(chapter));
  if (dry) mkdirSync(localDir, { recursive: true });

  // Ưu tiên lấy từ CDN gốc (đầy đủ hơn bản /upload/chaps hay bị 404/rỗng)
  const cdnFiles = await downloadFromCdn(chapter, info.url);
  if (cdnFiles.length >= info.images.length) {
    console.log(`  ✓ lấy ${cdnFiles.length} ảnh từ CDN`);
    return saveChapter(chapter, localDir, cdnFiles, [], info);
  }
  if (cdnFiles.length) {
    console.log(`  CDN chỉ có ${cdnFiles.length}/${info.images.length} ảnh → thử danh sách trong trang`);
  }

  // Tải hết về RAM trước; chỉ upload khi chương đủ ảnh
  const files = [];
  const missing = [];
  for (const [i, url] of info.images.entries()) {
    const image = await download(url, info.url);
    const sourceName = url.split('?url=').pop().split('?')[0].split('/').pop();
    if (!image) missing.push(sourceName);
    else files.push(image);

    process.stdout.write(`\r  ${i + 1}/${info.images.length} ${sourceName}${image ? '' : ' (404)'}   `);
    await sleep(DELAY_MS);
  }
  process.stdout.write('\n');

  // Nếu CDN vẫn nhiều ảnh hơn bản trong trang thì dùng CDN
  if (cdnFiles.length > files.length) {
    console.log(`  → dùng ${cdnFiles.length} ảnh từ CDN (trang chỉ có ${files.length})`);
    return saveChapter(chapter, localDir, cdnFiles, [], info);
  }
  return saveChapter(chapter, localDir, files, missing, info);
}

/**
 * Ảnh gốc trên CDN: https://i216.truyenvua.com/218/<chương>/<0..n>.jpg
 * CDN chặn tải trực tiếp (403) nên phải đi qua /image.php?url= của trang.
 */
const CDN_BASE = 'https://i216.truyenvua.com/218';

async function downloadFromCdn(chapter, referer) {
  const files = [];
  let misses = 0;
  for (let n = 0; n < 200 && misses < 2; n++) {
    const url = `${SITE}/image.php?url=${CDN_BASE}/${chapter}/${n}.jpg`;
    const image = await download(url, referer);
    if (image) {
      files.push(image);
      misses = 0;
    } else {
      misses++;
    }
    process.stdout.write(`\r  CDN ${n}.jpg${image ? '' : ' (không có)'}   `);
    await sleep(DELAY_MS);
  }
  process.stdout.write('\n');
  return files;
}

async function saveChapter(chapter, localDir, files, missing, info) {
  info.missing = missing;

  if (missing.length) {
    console.log(`  ⚠ thiếu ${missing.length}/${info.images.length} ảnh trên trang nguồn: ${missing.join(', ')}`);
  }

  for (const [i, { body, type }] of files.entries()) {
    const name = `${String(i + 1).padStart(3, '0')}.jpg`;
    if (dry) writeFileSync(join(localDir, name), body);
    else if (!missing.length) await putObject(`${chapter}/${name}`, body, type);
  }

  if (dry) {
    if (files.length) addToManifest(chapter, files.length);
    console.log(`  → đã lưu ${files.length} ảnh vào ${localDir} & cập nhật r2.ts`);
  }
  else if (missing.length) console.log('  → KHÔNG upload chương này vì thiếu ảnh');
  else {
    addToManifest(chapter, files.length);
    console.log(`  → đã upload & cập nhật r2.ts`);
  }
  return info;
}

function removeFromManifest(chapter) {
  const src = readFileSync(MANIFEST, 'utf8');
  writeFileSync(MANIFEST, src.replace(new RegExp(`^\\s*${chapter}:.*\\n`, 'm'), ''));
}

/** Cập nhật r2.ts theo số ảnh trong từng folder .downloads/<chương> */
function syncManifestFromDownloads() {
  if (!existsSync(DOWNLOAD_DIR)) return;
  for (const name of readdirSync(DOWNLOAD_DIR).filter((n) => /^\d+$/.test(n)).sort((a, b) => a - b)) {
    const dir = join(DOWNLOAD_DIR, name);
    const numbers = readdirSync(dir)
      .filter((f) => /^\d{3}\.jpg$/.test(f) && statSync(join(dir, f)).size >= 2048)
      .map((f) => Number(f.slice(0, 3)));
    if (numbers.length) {
      addToManifest(Number(name), numbers);
      console.log(`• ${name}: ${filesExpr(numbers)}`);
    } else {
      removeFromManifest(Number(name));
      console.log(`• ${name}: không có ảnh hợp lệ → bỏ khỏi r2.ts`);
    }
  }
}

async function main() {
  if (args.includes('--publish-manifest')) return publishManifest();
  if (args.includes('--sync-manifest')) {
    syncManifestFromDownloads();
    return dry ? undefined : publishManifest();
  }

  let from;
  let to;
  if (args.includes('--next')) {
    from = Math.max(...manifestChapters()) + 1;
    to = from + MAX_CHAPTERS_PER_RUN - 1;
  } else if (nums.length) {
    [from, to = nums[0]] = nums;
  } else {
    console.log('Cách dùng: node scripts/sync-chapters.mjs <từ> [đến] [--dry] | --next');
    process.exit(1);
  }

  for (let ch = from; ch <= to; ch++) {
    const info = await syncChapter(ch);
    if (!info || (!info.hasNext && ch < to)) {
      if (info) console.log(`• Chương ${ch} là chương mới nhất → dừng.`);
      break;
    }
  }

  if (!dry) await publishManifest();
}

main().catch((err) => {
  console.error('\n✖', err.message);
  process.exit(1);
});
