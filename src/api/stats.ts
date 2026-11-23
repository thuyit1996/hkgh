import AsyncStorage from '@react-native-async-storage/async-storage';

/** Thống kê đọc: các ngày có đọc (để tính chuỗi ngày) */

const DAYS_KEY = 'reading-days';
let recordedToday: string | null = null;

function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function getReadingDays(): Promise<string[]> {
  try {
    const list = JSON.parse((await AsyncStorage.getItem(DAYS_KEY)) ?? '[]') as unknown;
    return Array.isArray(list) ? list.filter((d): d is string => typeof d === 'string') : [];
  } catch {
    return [];
  }
}

/** Ghi nhận hôm nay có đọc (rẻ: chỉ ghi một lần mỗi ngày) */
export async function recordReadingDay(): Promise<void> {
  const today = dayKey();
  if (recordedToday === today) return;
  recordedToday = today;
  try {
    const days = await getReadingDays();
    if (!days.includes(today)) {
      await AsyncStorage.setItem(DAYS_KEY, JSON.stringify([...days, today].slice(-400)));
    }
  } catch {
    // bỏ qua
  }
}

/** Số ngày đọc liên tiếp, tính tới hôm nay (hoặc hôm qua nếu hôm nay chưa đọc) */
export function computeStreak(days: string[]): number {
  const set = new Set(days);
  const cursor = new Date();
  if (!set.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (set.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Cảnh giới võ học theo số chương đã đọc */
export const REALMS = [
  { min: 0, name: 'Nhập Môn', blurb: 'Vừa đặt chân vào giang hồ.' },
  { min: 5, name: 'Tam Lưu', blurb: 'Đã biết đôi đường quyền cước.' },
  { min: 15, name: 'Nhị Lưu', blurb: 'Nội công bắt đầu thành hình.' },
  { min: 30, name: 'Nhất Lưu', blurb: 'Tên tuổi đã có người nhắc tới.' },
  { min: 50, name: 'Tuyệt Đỉnh', blurb: 'Kiếm khí tùy tâm mà phát.' },
  { min: 75, name: 'Siêu Tuyệt Đỉnh', blurb: 'Một chiêu có thể định thắng bại.' },
  { min: 100, name: 'Hóa Cảnh', blurb: 'Võ học đã hóa vào hơi thở.' },
] as const;

export const FINAL_REALM = { name: 'Huyền Cảnh', blurb: 'Đã theo kịp mọi chương truyện.' };

export function getRealm(readCount: number, totalChapters: number) {
  if (totalChapters > 0 && readCount >= totalChapters) {
    return { current: FINAL_REALM, next: null, progress: 1 };
  }

  let index = 0;
  REALMS.forEach((realm, i) => {
    if (readCount >= realm.min) index = i;
  });

  const current = REALMS[index];
  const nextRealm = REALMS[index + 1];
  const nextMin = nextRealm?.min ?? totalChapters;
  const next = nextRealm ?? { min: totalChapters, ...FINAL_REALM };
  const span = Math.max(1, nextMin - current.min);

  return {
    current,
    next: { name: next.name, remaining: Math.max(0, nextMin - readCount) },
    progress: Math.min(1, (readCount - current.min) / span),
  };
}
