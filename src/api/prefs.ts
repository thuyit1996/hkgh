import AsyncStorage from '@react-native-async-storage/async-storage';

/** Tuỳ chọn nhỏ của người dùng, lưu trên máy */

export type ReaderTheme = 'dark' | 'sepia' | 'light';

export type ReaderPrefs = {
  theme: ReaderTheme;
  /** Độ tối phủ lên ảnh, 0 → 0.6 */
  dim: number;
  /** Tốc độ tự cuộn (px/giây), 0 = tắt */
  autoScroll: number;
  /** Kéo tiếp ở cuối chương / tự cuộn hết chương → sang chương sau */
  autoNext: boolean;
};

export const DEFAULT_READER_PREFS: ReaderPrefs = {
  theme: 'dark',
  dim: 0,
  autoScroll: 0,
  autoNext: true,
};

const READER_KEY = 'reader-prefs';
const LEGACY_THEME_KEY = 'reader-theme';
const ONBOARDED_KEY = 'onboarded';
const LAST_SEEN_KEY = 'last-seen-chapter';

export async function getReaderPrefs(): Promise<ReaderPrefs> {
  try {
    const raw = await AsyncStorage.getItem(READER_KEY);
    if (raw) return { ...DEFAULT_READER_PREFS, ...(JSON.parse(raw) as Partial<ReaderPrefs>) };

    // bản trước chỉ lưu theme
    const legacy = await AsyncStorage.getItem(LEGACY_THEME_KEY);
    if (legacy === 'light' || legacy === 'sepia' || legacy === 'dark') {
      return { ...DEFAULT_READER_PREFS, theme: legacy };
    }
  } catch {
    // bỏ qua
  }
  return DEFAULT_READER_PREFS;
}

export async function setReaderPrefs(prefs: ReaderPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(READER_KEY, JSON.stringify(prefs));
  } catch {
    // bỏ qua
  }
}

export async function hasOnboarded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDED_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setOnboarded(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDED_KEY, '1');
  } catch {
    // bỏ qua
  }
}

/** Chương mới nhất người dùng đã "thấy" — để báo "có chương mới" */
export async function getLastSeenChapter(): Promise<number | null> {
  try {
    const value = Number(await AsyncStorage.getItem(LAST_SEEN_KEY));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export async function setLastSeenChapter(chapter: number): Promise<void> {
  try {
    const prev = (await getLastSeenChapter()) ?? 0;
    if (chapter > prev) await AsyncStorage.setItem(LAST_SEEN_KEY, String(chapter));
  } catch {
    // bỏ qua
  }
}
