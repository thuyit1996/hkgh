# Hiệp Khách Giang Hồ — app đọc truyện (dùng cá nhân)

Trả lời người dùng bằng **tiếng Việt**.

## Kiến trúc

- Expo / React Native (expo-router, NativeWind), chạy chủ yếu trên **iOS simulator**.
  Trong simulator phải nhấn giữ chuột rồi kéo để cuộn; vuốt hai ngón trên trackpad không cuộn được.
- **Không có backend.** Thư mục `server/` cũ đã bị xoá.
  - Ảnh chương: app gọi thẳng Cloudflare R2 (`R2_BASE_URL` trong `src/data/r2.ts`).
  - Tiến độ đọc: lưu trên máy bằng AsyncStorage (`src/api/progress.ts`).
- `src/data/r2.ts` — `CHAPTER_FILES` là danh sách số file thật trên R2 của từng chương.
  - Chương < 510 dùng tên `0.webp, 1.webp…`; chương ≥ 510 dùng `001.jpg, 002.jpg…`.
  - Viết dạng `range(a, b)` hoặc `without(range(a, b), …)`, vì một số chương thiếu file ở giữa.
- Bucket R2 đang mở công khai qua link `pub-…r2.dev`. Link này bị Cloudflare giới hạn tốc độ (lỗi 1015); nên gắn tên miền riêng.

## Bản web / PWA (deploy Vercel)

- `npm run build:web` = `expo export -p web` (SPA, `output: "single"`) + `scripts/pwa-inject.mjs` chèn thẻ manifest/icon iOS/đăng ký SW vào `dist/index.html`.
  - KHÔNG dùng `src/app/+html.tsx`: Expo 58 bỏ mất thẻ JS/CSS khi có file này.
  - Không dùng `output: "static"`: SSR render với chiều cao màn hình = 0, hydrate giữ style sai.
- Code riêng cho web nằm ở file `.web.ts`: `src/api/offline.web.ts` (lưu ảnh vào Cache Storage `chapters`), `src/native/share.web.ts`, `src/native/haptics.web.ts`.
- `public/sw.js`: ảnh R2 ưu tiên lấy từ cache `chapters`; khung app lưu vào `shell-<VERSION>`. Đổi cách cache thì tăng `VERSION`.
- `vercel.json`: build command, rewrite mọi đường dẫn về `index.html`.
- Bucket R2 cần bật CORS (GET từ tên miền web) để tải offline/chia sẻ ảnh trên web.

## Script tải chương: `scripts/sync-chapters.mjs`

Cần Node ≥ 18. Máy mặc định đang dùng Node 16, nên chạy `source ~/.nvm/nvm.sh && nvm use` trước (dùng Node 24).

```bash
node scripts/sync-chapters.mjs 662 670 --dry     # tải về .downloads/<chương>/001.jpg… và tự cập nhật r2.ts
node scripts/sync-chapters.mjs --sync-manifest --dry   # cập nhật r2.ts theo các folder trong .downloads
```

- **Luôn dùng `--dry`.** Người dùng tự upload `.downloads/<chương>/` lên R2. Không có `--dry`, script sẽ upload và cần `.env` chứa R2 key.
- Nguồn ảnh: truyenqq.ca (`/truyen-tranh/hiep-khach-giang-ho/chuong-N`).
  - Script ưu tiên lấy từ CDN gốc qua `/image.php?url=https://i216.truyenvua.com/218/<chương>/<n>.jpg`. Từ khoảng chương 640 trở đi CDN này trả 404 cho nhiều chương, khi đó script dùng ảnh `/upload/chaps/<id>/NNN.jpg` trong trang.
  - Bỏ qua ảnh 404, ảnh rỗng (< 2KB) và link không phải ảnh. Có thử lại khi mất kết nối.
  - Chương phụ (`chuong-548-1`, `607-1…607-7`) bị bỏ qua. 548.1 là bản đăng lại của 548. 607.x có vẻ là nội dung riêng, chưa xử lý; app chỉ hỗ trợ chương số nguyên.
- Người dùng muốn tải theo lượt khoảng 10–30 chương, chạy nền rồi báo kết quả. Sau mỗi lượt, báo rõ chương thiếu hoặc lỗi.
- Khi người dùng tự bỏ ảnh (tải từ Facebook, tên file lộn xộn) vào folder, việc cần làm là:
  - Xem nội dung ảnh để xếp đúng thứ tự đọc. Trang có chữ "제NNN화" là trang đầu chương.
  - Đổi tên thành `001.jpg…`.
  - Lưu bảng đối chiếu tên cũ → mới vào `.downloads/<chương>-rename-map.txt`.
  - Thêm dòng vào `r2.ts`.
  - Có thể ghép ảnh xem trước bằng Swift/AppKit, vì máy không có PIL hay ImageMagick.

## Trạng thái (cập nhật 2026-11-24)

- Trong `r2.ts` hiện có chương **463–472** và **510–733** (733 là chương mới nhất).
- **Chương 521–733 nằm trong `.downloads/`, có thể chưa upload lên R2.**
- Chưa có: 1–462 và **473–509**.
- 640 và 655: ảnh do người dùng tự bổ sung, mình đã xếp thứ tự. Ảnh trùng khác bản dịch của 655 nằm ở `.downloads/655-extra/`.
- Thiếu vài trang trên trang nguồn:
  - Thiếu nhiều: 522 (10/27 trang; tải lại được từ CDN), 626 (5 trang cuối).
  - Thiếu 1–2 trang: 556, 557, 560, 561, 562, 608, 622, 623, 644.
  - Chương cũ trên R2 có lỗ: 466, 469, 470, 471, 516.
- Ảnh rác chưa xoá:
  - 574: `016` trùng `001`, `017` là banner beeng.net.
  - 561: `030` trùng `001`.
  - Nhiều chương có trang `001` kích thước 800×600, có thể là trang credit của nhóm dịch.
- Từ 702 trở đi tải từ truyenvn.my (`/truyen-tranh/hiep-khach-giang-ho-m/chapter-N`, ảnh trên imggo.net). Tải ảnh KHÔNG gửi Referer (gửi thì bị 403).
  - Chương 709 trên nguồn này là ảnh giả picsum.photos; người dùng tự bổ sung.
  - Nguồn chèn banner quảng cáo (900×555, 700×397, 888×979) ở đầu/cuối chương; chỉ xoá ở 706, 707 (trang 001) và 728–733. 711–727 giữ nguyên vì đã upload; bản đã lọc nằm ở `.downloads/_cleaned/`.
- **Ảnh dài cả chương** (cao 12.000–33.000px, app hiển thị thành dải nhỏ): 689–699, 730–733. Cần cắt thành từng trang.
- 682 thiếu `006.jpg`.
