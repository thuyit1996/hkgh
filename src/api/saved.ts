import AsyncStorage from '@react-native-async-storage/async-storage';

/** Các trang truyện người dùng lưu lại (khung tranh yêu thích) */

export type SavedPage = {
  chapter: number;
  page: number;
  url: string;
  savedAt: string;
};

const KEY = 'saved-pages';

export async function getSavedPages(): Promise<SavedPage[]> {
  try {
    const list = JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]') as unknown;
    return Array.isArray(list) ? (list as SavedPage[]) : [];
  } catch {
    return [];
  }
}

export async function isPageSaved(chapter: number, page: number): Promise<boolean> {
  return (await getSavedPages()).some((p) => p.chapter === chapter && p.page === page);
}

export async function savePage(entry: Omit<SavedPage, 'savedAt'>): Promise<void> {
  const list = await getSavedPages();
  if (list.some((p) => p.chapter === entry.chapter && p.page === entry.page)) return;
  const next = [{ ...entry, savedAt: new Date().toISOString() }, ...list];
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // bỏ qua
  }
}

export async function removeSavedPage(chapter: number, page: number): Promise<void> {
  const list = await getSavedPages();
  try {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify(list.filter((p) => !(p.chapter === chapter && p.page === page)))
    );
  } catch {
    // bỏ qua
  }
}
