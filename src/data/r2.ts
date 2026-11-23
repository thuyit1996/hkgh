/**
 * Ảnh truyện lưu trên Cloudflare R2, app gọi thẳng URL (không qua server).
 *
 * Quy tắc tên file:
 * - Chương < 510: 0.webp, 1.webp, 2.webp, ...
 * - Chương >= 510: 001.jpg, 002.jpg, 003.jpg, ...
 */
/**
 * Đặt EXPO_PUBLIC_R2_BASE_URL trong .env để dùng tên miền riêng (vd https://img.example.com):
 * r2.dev bị giới hạn tốc độ và không có CDN cache, tên miền riêng tải nhanh hơn nhiều.
 */
export const R2_BASE_URL = (
  process.env.EXPO_PUBLIC_R2_BASE_URL || 'https://pub-f65d8e49e1c14e5aa329a93ab73c0cf3.r2.dev'
).replace(/\/+$/, '');

const JPG_FROM_CHAPTER = 510;

export function getChapterImageUrl(chapter: number, fileNumber: number): string {
  if (chapter < JPG_FROM_CHAPTER) {
    return `${R2_BASE_URL}/${chapter}/${fileNumber}.webp`;
  }
  return `${R2_BASE_URL}/${chapter}/${String(fileNumber).padStart(3, '0')}.jpg`;
}

/** Dải số liên tục [from, to] */
function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

function without(list: number[], ...missing: number[]): number[] {
  return list.filter((n) => !missing.includes(n));
}

/**
 * Số thứ tự file thực sự có trên R2 của từng chương.
 * Một số chương bị thiếu file ở giữa (vd 466 thiếu 13, 510 không có 001.jpg),
 * nên không thể chỉ dựa vào "tổng số trang".
 * Upload chương mới → thêm một dòng vào đây.
 */
export const CHAPTER_FILES: Record<number, number[]> = {
  463: range(0, 19),
  464: range(0, 19),
  465: range(0, 19),
  466: without(range(0, 19), 13),
  467: range(0, 19),
  468: range(0, 19),
  469: without(range(0, 23), 2),
  470: without(range(0, 25), 7, 8),
  471: without(range(0, 19), 7),
  472: range(0, 17),
  510: range(2, 21),
  511: range(1, 31),
  512: range(2, 22),
  513: range(2, 31),
  514: range(1, 26),
  515: range(1, 20),
  516: without(range(1, 30), 17, 18),
  517: range(3, 26),
  518: range(2, 31),
  519: range(1, 30),
  520: range(2, 14),
  521: range(1, 21),
  522: range(1, 17),
  523: range(1, 30),
  524: range(1, 27),
  525: range(2, 31),
  526: range(1, 31),
  527: range(1, 34),
  528: range(1, 20),
  529: range(1, 27),
  530: range(1, 25),
  531: range(1, 28),
  532: range(1, 28),
  533: range(1, 21),
  534: range(1, 22),
  535: range(1, 33),
  536: range(1, 21),
  537: range(1, 28),
  538: range(1, 23),
  539: range(1, 23),
  540: range(1, 32),
  541: range(1, 33),
  542: range(1, 21),
  543: range(1, 38),
  544: range(1, 27),
  545: range(1, 31),
  546: range(1, 21),
  547: range(1, 31),
  548: range(1, 21),
  549: range(1, 31),
  550: range(1, 30),
  551: range(1, 32),
  552: range(1, 33),
  553: range(1, 22),
  554: range(1, 32),
  555: range(1, 24),
  556: range(1, 34),
  557: range(1, 22),
  558: range(1, 30),
  559: range(1, 22),
  560: range(1, 29),
  561: range(1, 30),
  562: range(1, 20),
  563: range(1, 22),
  564: range(1, 21),
  565: range(1, 23),
  566: range(1, 23),
  567: range(1, 20),
  568: range(1, 20),
  569: range(1, 20),
  570: range(1, 20),
  571: range(1, 16),
  572: range(1, 20),
  573: range(1, 18),
  574: range(1, 17),
  575: range(1, 19),
  576: range(1, 31),
  577: range(1, 21),
  578: range(1, 18),
  579: range(1, 23),
  580: range(1, 22),
  581: range(1, 24),
  582: range(1, 23),
  583: range(1, 22),
  584: range(1, 16),
  585: range(1, 21),
  586: range(1, 24),
  587: range(1, 20),
  588: range(1, 39),
  589: range(1, 26),
  590: range(1, 30),
  591: range(1, 25),
  592: range(1, 31),
  593: range(1, 14),
  594: range(1, 18),
  595: range(1, 20),
  596: range(1, 20),
  597: range(1, 20),
  598: range(1, 28),
  599: range(1, 20),
  600: range(1, 26),
  601: range(1, 16),
  602: range(1, 20),
  603: range(1, 21),
  604: range(1, 16),
  605: range(1, 20),
  606: range(1, 20),
  607: range(1, 23),
  608: range(1, 20),
  609: range(1, 30),
  610: range(1, 21),
  611: range(1, 15),
  612: range(1, 22),
  613: range(1, 20),
  614: range(1, 16),
  615: range(1, 23),
  616: range(1, 21),
  617: range(1, 16),
  618: range(1, 24),
  619: range(1, 20),
  620: range(1, 20),
  621: range(1, 20),
  622: range(1, 17),
  623: range(1, 15),
  624: range(1, 24),
  625: range(1, 19),
  626: range(1, 17),
  627: range(1, 20),
  628: range(1, 16),
  629: range(1, 20),
  630: range(1, 21),
  631: range(1, 20),
  632: range(1, 18),
  633: range(1, 22),
  634: range(1, 22),
  635: range(1, 18),
  636: range(1, 15),
  637: range(1, 18),
  638: range(1, 17),
  639: range(1, 21),
  640: range(1, 23),
  641: range(1, 18),
  642: range(1, 20),
  643: range(1, 20),
  644: range(1, 19),
  645: range(1, 18),
  646: range(1, 22),
  647: range(1, 24),
  648: range(1, 18),
  649: range(1, 22),
  650: range(1, 20),
  651: range(1, 18),
  652: range(1, 18),
  653: range(1, 20),
  654: range(1, 20),
  655: range(1, 16),
  656: range(1, 26),
  657: range(1, 20),
  658: range(1, 18),
  659: range(1, 28),
  660: range(1, 32),
  661: range(1, 26),
  662: range(1, 16),
  663: range(1, 32),
  664: range(1, 30),
};

export const AVAILABLE_CHAPTERS = Object.keys(CHAPTER_FILES)
  .map(Number)
  .sort((a, b) => a - b);

/** Danh sách URL ảnh của một chương theo thứ tự đọc (rỗng nếu chưa có) */
export function getChapterImages(chapter: number): string[] {
  return (CHAPTER_FILES[chapter] ?? []).map((n) => getChapterImageUrl(chapter, n));
}
