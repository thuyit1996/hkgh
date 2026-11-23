import AsyncStorage from '@react-native-async-storage/async-storage';

import { recordReadingDay } from './stats';

/** Tiến độ đọc lưu ngay trên máy (không cần backend) */
export type ReadingProgress = {
 chapter: number;
 page: number;
 updatedAt: string | null;
};

const STORAGE_KEY = 'reading-progress';
const READ_KEY = 'read-chapters';

function devLog(message: string) {
 if (__DEV__) console.log(`[progress] ${message}`);
}

export async function getProgress(): Promise<ReadingProgress | null> {
 try {
 const raw = await AsyncStorage.getItem(STORAGE_KEY);
 if (!raw) return null;

 const body = JSON.parse(raw) as ReadingProgress;
 if (!Number.isInteger(body.chapter) || body.chapter < 1) return null;

 devLog(`đọc: chương ${body.chapter}, trang ${body.page}`);
 return body;
 } catch {
 return null;
 }
}

export async function saveProgress(chapter: number, page: number): Promise<void> {
 if (!Number.isInteger(chapter) || chapter < 1) return;

 const data: ReadingProgress = {
 chapter,
 page: Number.isInteger(page) && page > 0 ? page : 1,
 updatedAt: new Date().toISOString(),
 };

 recordReadingDay();
 try {
 await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
 devLog(`lưu: chương ${chapter}, trang ${data.page}`);
 } catch {
 // bộ nhớ máy lỗi: vẫn giữ tiến độ trong RAM
 }
}

/** Các chương đã đọc tới cuối */
export async function getReadChapters(): Promise<number[]> {
 try {
 const raw = await AsyncStorage.getItem(READ_KEY);
 const list = raw ? (JSON.parse(raw) as unknown) : [];
 return Array.isArray(list) ? list.filter((n): n is number => Number.isInteger(n)) : [];
 } catch {
 return [];
 }
}

export async function markChapterRead(chapter: number): Promise<void> {
 if (!Number.isInteger(chapter) || chapter < 1) return;
 try {
 const list = await getReadChapters();
 if (list.includes(chapter)) return;
 await AsyncStorage.setItem(READ_KEY, JSON.stringify([...list, chapter]));
 devLog(`đã đọc xong chương ${chapter}`);
 } catch {
 // bỏ qua
 }
}
