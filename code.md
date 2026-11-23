# commic — Cau hinh du an

> Phan `01-config` · 124 dong

## `app.json`

```json
{
 "expo": {
 "name": "commic",
 "slug": "commic",
 "scheme": "commic",
 "version": "1.0.0",
 "orientation": "portrait",
 "icon": "./assets/icon.png",
 "userInterfaceStyle": "light",
 "plugins": ["expo-router"],
 "ios": {
 "supportsTablet": true
 },
 "android": {
 "adaptiveIcon": {
 "backgroundColor": "#E6F4FE",
 "foregroundImage": "./assets/android-icon-foreground.png",
 "backgroundImage": "./assets/android-icon-background.png",
 "monochromeImage": "./assets/android-icon-monochrome.png"
 },
 "predictiveBackGestureEnabled": false,
 "package": "com.anonymous.commic"
 },
 "web": {
 "favicon": "./assets/favicon.png"
 }
 }
}
```

## `package.json`

```json
{
 "name": "commic",
 "version": "1.0.0",
 "main": "expo-router/entry",
 "dependencies": {
 "@expo/vector-icons": "15.1.1",
 "expo": "~58.0.25",
 "expo-constants": "~58.0.16",
 "expo-linear-gradient": "~58.0.4",
 "expo-linking": "~58.0.17",
 "expo-router": "~58.0.31",
 "expo-status-bar": "~58.0.5",
 "nativewind": "4.2.7",
 "react": "19.3.0",
 "react-native": "0.88.1",
 "react-native-css-interop": "0.2.7",
 "react-native-safe-area-context": "~5.11.1",
 "react-native-screens": "~4.30.1"
 },
 "devDependencies": {
 "@types/react": "~19.3.0",
 "tailwindcss": "3.4.17",
 "typescript": "~6.0.3"
 },
 "scripts": {
 "start": "expo start",
 "android": "expo run:android",
 "ios": "expo run:ios",
 "web": "expo start --web"
 },
 "private": true
}
```

## `tsconfig.json`

```json
{
 "extends": "expo/tsconfig.base",
 "compilerOptions": {
 "strict": true,
 "paths": {
 "@/*": ["./src/*"]
 }
 },
 "include": ["**/*.ts", "**/*.tsx", "nativewind-env.d.ts"]
}
```

## `babel.config.js`

```js
module.exports = function (api) {
 api.cache(true);
 return {
 presets: [
 ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
 'nativewind/babel',
 ],
 };
};
```

## `metro.config.js`

```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

## `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
 content: ['./src/**/*.{js,jsx,ts,tsx}'],
 presets: [require('nativewind/preset')],
 theme: {
 extend: {
 colors: {
 brand: {
 DEFAULT: '#2F6BFF',
 dark: '#1E4FD8',
 soft: '#EAF1FF',
 },
 ink: {
 DEFAULT: '#111827',
 muted: '#6B7280',
 faint: '#9CA3AF',
 },
 surface: '#F6F8FC',
 },
 borderRadius: {
 xl2: '20px',
 },
 },
 },
 plugins: [],
};
```

## `global.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## `nativewind-env.d.ts`

```ts
/// <reference types="nativewind/types" />

declare module '*.css';
```

# commic — Backend Express

> Phan `02-server` · 208 dong

## `server/package.json`

```json
{
 "name": "commic-server",
 "version": "1.0.0",
 "private": true,
 "description": "Backend API trả danh sách ảnh của chapter cho app React Native",
 "main": "src/index.js",
 "scripts": {
 "start": "node src/index.js",
 "dev": "node --watch src/index.js"
 },
 "dependencies": {
 "cors": "^2.8.5",
 "express": "^4.21.2"
 }
}
```

## `server/src/index.js`

```js
const fs = require('node:fs');
const path = require('node:path');

const express = require('express');
const cors = require('cors');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const IMAGES_DIR = path.resolve(__dirname, '..', 'images');
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const PROGRESS_FILE = path.join(DATA_DIR, 'progress.json');

// Tỉ lệ cao/rộng của trang truyện (dùng cho client dựng layout trước khi ảnh tải xong)
const PAGE_ASPECT = 1.445;

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json());

// ── Debug: log mọi request đến server ────────────────────────────────────────
const stats = { total: 0, api: 0, images: 0, errors: 0 };
const startedAt = Date.now();

function pad(value) {
 return String(value).padStart(2, '0');
}

function timestamp() {
 const d = new Date();
 return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

app.use((req, res, next) => {
 const start = process.hrtime.bigint();

 res.on('finish', () => {
 const ms = Number(process.hrtime.bigint() - start) / 1e6;

 stats.total += 1;
 if (req.path.startsWith('/images/')) stats.images += 1;
 else if (req.path.startsWith('/api/')) stats.api += 1;
 if (res.statusCode >= 400) stats.errors += 1;

 const tag = req.path.startsWith('/images/') ? 'IMG' : 'API';
 console.log(
 `[${timestamp()}] ${tag} ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms.toFixed(
 1
 )}ms) ip=${req.ip}`
 );
 });

 next();
});

/** Danh sách chương đang có ảnh trên đĩa */
function listChapters() {
 if (!fs.existsSync(IMAGES_DIR)) return [];
 return fs
 .readdirSync(IMAGES_DIR, { withFileTypes: true })
 .filter((entry) => entry.isDirectory() && /^ch-\d+$/.test(entry.name))
 .map((entry) => Number(entry.name.slice(3)))
 .sort((a, b) => a - b);
}

/** Danh sách trang của một chương, sắp xếp theo tên file */
function listPages(chapter) {
 const dir = path.join(IMAGES_DIR, `ch-${chapter}`);
 if (!fs.existsSync(dir)) return null;

 const files = fs
 .readdirSync(dir)
 .filter((name) => /\.(webp|jpg|jpeg|png)$/i.test(name))
 .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

 return files;
}

function baseUrl(req) {
 const configured = process.env.PUBLIC_BASE_URL;
 if (configured) return configured.replace(/\/$/, '');
 return `${req.protocol}://${req.get('host')}`;
}

// Ảnh tĩnh: cache vĩnh viễn vì tên file là bất biến
app.use(
 '/images',
 express.static(IMAGES_DIR, {
 maxAge: '365d',
 immutable: true,
 fallthrough: true,
 })
);

// ── Tiến độ đọc (lưu ra file JSON, không cần DB) ─────────────────────────────
function readProgress() {
 try {
 return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
 } catch {
 return { chapter: 0, page: 1, updatedAt: null };
 }
}

function writeProgress(data) {
 fs.mkdirSync(DATA_DIR, { recursive: true });
 fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/progress', (req, res) => {
 res.set('Cache-Control', 'no-store');
 res.json(readProgress());
});

app.post('/api/progress', (req, res) => {
 const chapter = Number(req.body?.chapter);
 const page = Number(req.body?.page ?? 1);

 if (!Number.isInteger(chapter) || chapter < 1) {
 return res.status(400).json({ error: 'Số chương không hợp lệ' });
 }

 const data = {
 chapter,
 page: Number.isInteger(page) && page > 0 ? page : 1,
 updatedAt: new Date().toISOString(),
 };
 writeProgress(data);
 res.json(data);
});

app.get('/health', (req, res) => {
 res.json({
 status: 'ok',
 chapters: listChapters(),
 stats: {
 ...stats,
 uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
 },
 });
});

app.get('/api/chapters', (req, res) => {
 res.set('Cache-Control', 'public, max-age=60');
 res.json({
 chapters: listChapters().map((chapter) => ({
 chapter,
 pages: (listPages(chapter) || []).length,
 })),
 });
});

app.get('/api/chapters/:chapter', (req, res) => {
 const chapter = Number(req.params.chapter);

 if (!Number.isInteger(chapter) || chapter < 1) {
 return res.status(400).json({ error: 'Số chương không hợp lệ' });
 }

 const files = listPages(chapter);
 if (!files) {
 return res.status(404).json({
 error: 'Chương chưa có dữ liệu',
 chapter,
 availableChapters: listChapters(),
 });
 }

 const origin = baseUrl(req);

 res.set('Cache-Control', 'public, max-age=300');
 res.json({
 chapter,
 pageCount: files.length,
 aspectRatio: PAGE_ASPECT,
 pages: files.map((name, index) => ({
 index: index + 1,
 url: `${origin}/images/ch-${chapter}/${encodeURIComponent(name)}`,
 })),
 });
});

app.use((req, res) => {
 res.status(404).json({ error: 'Not found', path: req.path });
});

app.listen(PORT, HOST, () => {
 const chapters = listChapters();
 console.log(`[commic-server] http://${HOST}:${PORT}`);
 console.log(`[commic-server] chapters: ${chapters.length ? chapters.join(', ') : 'none'}`);
 console.log(`[commic-server] images: ${IMAGES_DIR}`);
});
```

# commic — Lop goi API + helper

> Phan `03-api-utils` · 196 dong

## `src/api/chapters.ts`

```ts
export const API_BASE = (
 process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:3000'
).replace(/\/$/, '');

export type ChapterPage = {
 index: number;
 url: string;
};

export type ChapterPayload = {
 chapter: number;
 pageCount: number;
 aspectRatio: number;
 pages: ChapterPage[];
};

export type ChapterSummary = {
 chapter: number;
 pages: number;
};

function devLog(message: string) {
 if (__DEV__) console.log(`[api] ${message}`);
}

/** fetch có timeout để không treo UI khi mất kết nối */
export async function fetchWithTimeout(
 url: string,
 init: RequestInit = {},
 ms = 8000
): Promise<Response> {
 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), ms);
 const outer = init.signal;
 const onAbort = () => controller.abort();
 outer?.addEventListener('abort', onAbort);

 try {
 return await fetch(url, { ...init, signal: controller.signal });
 } finally {
 clearTimeout(timer);
 outer?.removeEventListener('abort', onAbort);
 }
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
 const url = `${API_BASE}${path}`;
 const started = Date.now();
 devLog(`→ GET ${url}`);

 try {
 const res = await fetchWithTimeout(url, { signal });
 const body = (await res.json().catch(() => null)) as
 | (T & { error?: string })
 | null;

 if (!res.ok) {
 const message = body?.error ?? `HTTP ${res.status}`;
 devLog(`← ${res.status} ${path} (${Date.now() - started}ms) — ${message}`);
 throw new Error(message);
 }

 devLog(`← ${res.status} ${path} (${Date.now() - started}ms)`);
 return body as T;
 } catch (err) {
 if ((err as Error).name !== 'AbortError') {
 devLog(`✖ ${path} (${Date.now() - started}ms) — ${(err as Error).message}`);
 }
 throw err;
 }
}

export async function getChapters(signal?: AbortSignal): Promise<ChapterSummary[]> {
 const body = await request<{ chapters?: ChapterSummary[] }>('/api/chapters', signal);
 return body.chapters ?? [];
}

export async function getChapterPages(
 chapter: number,
 signal?: AbortSignal
): Promise<ChapterPayload> {
 return request<ChapterPayload>(`/api/chapters/${chapter}`, signal);
}
```

## `src/api/progress.ts`

```ts
import { API_BASE, fetchWithTimeout } from './chapters';

export type ReadingProgress = {
 chapter: number;
 page: number;
 updatedAt: string | null;
};

function devLog(message: string) {
 if (__DEV__) console.log(`[api] ${message}`);
}

export async function getProgress(signal?: AbortSignal): Promise<ReadingProgress | null> {
 try {
 const res = await fetchWithTimeout(`${API_BASE}/api/progress`, { signal }, 6000);
 if (!res.ok) return null;
 const body = (await res.json()) as ReadingProgress;
 devLog(`← 200 /api/progress (chapter ${body.chapter}, page ${body.page})`);
 return body;
 } catch {
 return null;
 }
}

export async function saveProgress(chapter: number, page: number): Promise<void> {
 try {
 await fetchWithTimeout(
 `${API_BASE}/api/progress`,
 {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ chapter, page }),
 },
 6000
 );
 devLog(`→ POST /api/progress (chapter ${chapter}, page ${page})`);
 } catch {
 // offline: giữ tiến độ trong bộ nhớ
 }
}
```

## `src/utils/navigation.ts`

```ts
import { router } from 'expo-router';

/**
 * Quay lại màn trước; nếu không có (mở app bằng deep link / reload trực tiếp
 * vào màn con) thì về trang chủ thay vì ném lỗi GO_BACK.
 */
export function goBackOrHome() {
 if (router.canGoBack()) {
 router.back();
 return;
 }
 router.replace('/home');
}
```

## `src/data/mock.ts`

```ts
import type { ImageSourcePropType } from 'react-native';

export type Comic = {
 title: string;
 author: string;
 cover: ImageSourcePropType;
 status: 'Đang ra' | 'Hoàn thành';
 updatedAt: string;
 genres: string[];
 rating: number;
 reviews: string;
 description: string;
};

export type Chapter = {
 id: string;
 index: number;
 title: string;
};

export const cover = require('../../assets/comic/hero.png');
export const onboardingImage = require('../../assets/comic/onboarding-bg.png');

/** App chỉ phục vụ duy nhất truyện này */
export const comic: Comic = {
 title: 'Ta Có Một Sơn Trại',
 author: 'Hắc Sơn Dương',
 cover,
 status: 'Đang ra',
 updatedAt: 'Cập nhật 2 giờ trước',
 genres: ['Cổ đại', 'Hài hước', 'Hệ thống', 'Xuyên không'],
 rating: 4.9,
 reviews: '6.8K',
 description:
 'Xuyên không thành trại chủ của một sơn trại nghèo, hắn phải dùng hệ thống kỳ quái để chiêu mộ nhân tài, cướp của người giàu chia cho người nghèo và biến sơn trại thành thế lực số một thiên hạ.',
};

const chapterTitles = [
 'Sơn Tặc Chi Tâm',
 'Nhiệm Vụ Liên Tiếp',
 'Cướp Ấp Trại Phu Nhân',
 'Một Nhát Bổ Đầu',
 'Đàn Đại Vương Muốn Động Phòng',
 'Thánh Chủ Hắc Thạch',
 'Đoạch Phòng Thủ Của Trinh',
 'Chân Tình',
 'Của Quân Sư',
 'Gặp Trục Trặc ??',
 'Lâm Thiếu Vũ Là Đại Án Nhân',
];

export const chapters: Chapter[] = chapterTitles.map((title, i) => ({
 id: `ch-${i + 1}`,
 index: i + 1,
 title,
}));
```

# commic — State, hook, component dung chung

> Phan `04-state-components` · 204 dong

## `src/store/progress.ts`

```ts
import { useSyncExternalStore } from 'react';

import { getProgress, saveProgress } from '../api/progress';

/** Vị trí đọc hiện tại (chương + trang), đồng bộ lên server có debounce */
let lastReadChapter = 0;
let lastReadPage = 1;
let hydrated = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const listeners = new Set<() => void>();

function emit() {
 listeners.forEach((listener) => listener());
}

function scheduleSave() {
 if (saveTimer) clearTimeout(saveTimer);
 saveTimer = setTimeout(() => {
 saveTimer = null;
 void saveProgress(lastReadChapter, lastReadPage);
 }, 800);
}

export const readingProgress = {
 get: () => lastReadChapter,
 getPage: () => lastReadPage,

 /** Lấy tiến độ đã lưu trên server (gọi 1 lần khi app khởi động) */
 async hydrate() {
 if (hydrated) return;
 hydrated = true;

 const remote = await getProgress();
 if (remote && remote.chapter > lastReadChapter) {
 lastReadChapter = remote.chapter;
 lastReadPage = remote.page || 1;
 emit();
 }
 },

 markRead(chapterIndex: number, page = 1) {
 const changed = chapterIndex !== lastReadChapter || page !== lastReadPage;

 lastReadChapter = chapterIndex;
 lastReadPage = page;

 if (changed) emit();
 scheduleSave();
 },

 subscribe(listener: () => void) {
 listeners.add(listener);
 return () => {
 listeners.delete(listener);
 };
 },
};

export function useLastReadChapter() {
 return useSyncExternalStore(
 readingProgress.subscribe,
 readingProgress.get,
 readingProgress.get
 );
}
```

## `src/hooks/useChapters.ts`

```ts
import { useCallback, useEffect, useState } from 'react';

import { getChapters } from '../api/chapters';
import { chapters as knownChapters } from '../data/mock';

export type ChapterItem = {
 id: string;
 index: number;
 title: string;
 pages: number;
};

/** Danh sách chương lấy từ API; tiêu đề lấy từ dữ liệu tĩnh nếu có */
export function useChapters() {
 const [items, setItems] = useState<ChapterItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 const load = useCallback((signal?: AbortSignal) => {
 setLoading(true);
 setError(null);

 getChapters(signal)
 .then((list) => {
 setItems(
 list.map((entry) => ({
 id: `ch-${entry.chapter}`,
 index: entry.chapter,
 title:
 knownChapters.find((known) => known.index === entry.chapter)?.title ??
 `Chương ${entry.chapter}`,
 pages: entry.pages,
 }))
 );
 setLoading(false);
 })
 .catch((err: Error) => {
 if (err.name === 'AbortError') return;
 setError(err.message);
 setLoading(false);
 });
 }, []);

 useEffect(() => {
 const controller = new AbortController();
 load(controller.signal);
 return () => controller.abort();
 }, [load]);

 return { items, loading, error, reload: load };
}
```

## `src/components/Skeleton.tsx`

```tsx
import { useEffect, useRef } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
 height?: number;
 width?: number | `${number}%`;
 radius?: number;
 color?: string;
 style?: StyleProp<ViewStyle>;
};

/** Khối xám nhấp nháy dùng cho trạng thái loading */
export function Skeleton({ height = 16, width, radius = 8, color = '#E5E7EB', style }: Props) {
 const opacity = useRef(new Animated.Value(0.45)).current;

 useEffect(() => {
 const loop = Animated.loop(
 Animated.sequence([
 Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
 Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
 ])
 );
 loop.start();
 return () => loop.stop();
 }, [opacity]);

 return (
 <Animated.View
 style={[
 { height, width, borderRadius: radius, backgroundColor: color, opacity },
 style,
 ]}
 />
 );
}
```

## `src/components/FadeInImage.tsx`

```tsx
import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';

import { Skeleton } from './Skeleton';

type Props = {
 uri: string;
 width: number;
 height: number;
 dark?: boolean;
};

/** Ảnh trang truyện: hiện skeleton đúng tỉ lệ rồi fade-in khi tải xong */
export function FadeInImage({ uri, width, height, dark }: Props) {
 const [loaded, setLoaded] = useState(false);
 const opacity = useRef(new Animated.Value(0)).current;

 useEffect(() => {
 if (!loaded) return;
 Animated.timing(opacity, {
 toValue: 1,
 duration: 220,
 useNativeDriver: true,
 }).start();
 }, [loaded, opacity]);

 return (
 <View style={{ width, height, backgroundColor: dark ? '#111111' : '#F1F3F7' }}>
 {!loaded ? (
 <Skeleton
 height={height}
 width={width}
 radius={0}
 color={dark ? '#1F1F1F' : '#E5E7EB'}
 style={{ position: 'absolute' }}
 />
 ) : null}

 <Animated.Image
 source={{ uri }}
 style={{ position: 'absolute', width, height, opacity }}
 resizeMode="cover"
 onLoad={() => setLoaded(true)}
 onError={() => setLoaded(true)}
 />
 </View>
 );
}
```

# commic — Man hinh nho

> Phan `05-screens-small` · 197 dong

## `src/app/_layout.tsx`

```tsx
import '../../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { readingProgress } from '../store/progress';

export default function RootLayout() {
 useEffect(() => {
 void readingProgress.hydrate();
 }, []);

 return (
 <SafeAreaProvider>
 <StatusBar style="dark" />
 <Stack
 screenOptions={{
 headerShown: false,
 contentStyle: { backgroundColor: '#FFFFFF' },
 animation: 'slide_from_right',
 }}
 >
 <Stack.Screen name="index" options={{ animation: 'fade' }} />
 <Stack.Screen name="read" options={{ animation: 'fade' }} />
 </Stack>
 </SafeAreaProvider>
 );
}
```

## `src/app/index.tsx`

```tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { onboardingImage } from '../data/mock';
import { readingProgress } from '../store/progress';

const DOTS = 3;

export default function OnboardingScreen() {
 const insets = useSafeAreaInsets();
 const { height } = useWindowDimensions();
 const [active, setActive] = useState(0);
 const [ready, setReady] = useState(false);

 // Đã đọc trước đó thì vào thẳng trang truyện
 useEffect(() => {
 let cancelled = false;
 const safety = setTimeout(() => {
 if (!cancelled) setReady(true);
 }, 4000);

 void readingProgress.hydrate().finally(() => {
 if (!cancelled) setReady(true);
 });

 return () => {
 cancelled = true;
 clearTimeout(safety);
 };
 }, []);

 if (!ready) {
 return <View className="flex-1 bg-white" />;
 }

 if (readingProgress.get() > 0) {
 return <Redirect href="/home" />;
 }

 return (
 <ScrollView
 className="flex-1 bg-white"
 bounces={false}
 showsVerticalScrollIndicator={false}
 contentContainerStyle={{ flexGrow: 1 }}
 >
 <View style={{ height: height * 0.52 }}>
 <Image source={onboardingImage} className="h-full w-full" resizeMode="cover" />
 <LinearGradient
 colors={['rgba(0,0,0,0.3)', 'transparent']}
 className="absolute left-0 right-0 top-0 h-24"
 />
 </View>

 <View
 className="-mt-7 flex-1 rounded-t-[32px] bg-white px-6 pt-6"
 style={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}
 >
 <Text className="text-[25px] font-extrabold leading-8 text-ink">
 Chào mừng bạn đến với
 </Text>
 <Text className="mt-0.5 text-[25px] font-extrabold leading-8 text-brand">
 Comic Plunder 👋
 </Text>
 <Text className="mt-2.5 text-[13px] leading-5 text-ink-muted">
 Ứng dụng số một về Truyện tranh và ứng dụng đọc trên toàn thế giới
 </Text>

 <View className="mt-5 flex-row items-center justify-center gap-1.5">
 {Array.from({ length: DOTS }).map((_, i) => (
 <Pressable
 key={i}
 onPress={() => setActive(i)}
 hitSlop={6}
 className={
 i === active
 ? 'h-1.5 w-6 rounded-full bg-brand'
 : 'h-1.5 w-3 rounded-full bg-slate-200'
 }
 />
 ))}
 </View>

 <Pressable className="mt-5 flex-row items-center justify-center rounded-full border border-slate-200 py-3 active:opacity-70">
 <Ionicons name="logo-google" size={18} color="#EA4335" />
 <Text className="ml-2 text-[14px] font-semibold text-ink">Tiếp tục với Google</Text>
 </Pressable>

 <Pressable
 className="mt-2.5 items-center justify-center rounded-full bg-brand py-3.5 active:opacity-80"
 onPress={() => router.replace('/home')}
 >
 <Text className="text-[15px] font-bold text-white">Bắt đầu</Text>
 </Pressable>

 <Pressable
 className="mt-2.5 items-center justify-center rounded-full bg-brand-soft py-3.5 active:opacity-80"
 onPress={() => router.replace('/home')}
 >
 <Text className="text-[14px] font-semibold text-brand">Đã có tài khoản?</Text>
 </Pressable>
 </View>
 </ScrollView>
 );
}
```

## `src/app/settings.tsx`

```tsx
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API_BASE } from '../api/chapters';
import { comic } from '../data/mock';
import { goBackOrHome } from '../utils/navigation';

export default function SettingsScreen() {
 const insets = useSafeAreaInsets();

 const rows = [
 { icon: 'server-outline', label: 'Máy chủ API', value: API_BASE },
 { icon: 'book-outline', label: 'Truyện', value: comic.title },
 { icon: 'information-circle-outline', label: 'Phiên bản', value: '1.0.0' },
 ] as const;

 return (
 <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
 <View className="flex-row items-center px-4 py-3">
 <Pressable hitSlop={10} className="active:opacity-60" onPress={goBackOrHome}>
 <Ionicons name="arrow-back" size={22} color="#111827" />
 </Pressable>
 <Text className="ml-3 text-[17px] font-bold text-ink">Cài đặt</Text>
 </View>

 <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
 <View className="overflow-hidden rounded-2xl bg-surface">
 {rows.map((row, index) => (
 <View
 key={row.label}
 className={`flex-row items-center justify-between px-4 py-3.5 ${
 index > 0 ? 'border-t border-white' : ''
 }`}
 >
 <View className="flex-row items-center">
 <Ionicons name={row.icon} size={18} color="#6B7280" />
 <Text className="ml-2.5 text-[13px] text-ink">{row.label}</Text>
 </View>
 <Text numberOfLines={1} className="ml-3 flex-1 text-right text-[12px] text-ink-muted">
 {row.value}
 </Text>
 </View>
 ))}
 </View>

 <Text className="mt-4 px-1 text-[11px] leading-4 text-ink-faint">
 App chỉ phục vụ một truyện duy nhất. Dữ liệu chương được tải từ backend; tiến độ đọc hiện
 chỉ lưu trong phiên (cần AsyncStorage để lưu bền).
 </Text>
 </ScrollView>
 </View>
 );
}
```

# commic — Man danh sach chuong

> Phan `06-chapters` · 142 dong

## `src/app/chapters.tsx`

```tsx
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Skeleton } from '../components/Skeleton';
import { comic } from '../data/mock';
import { useChapters } from '../hooks/useChapters';
import { useLastReadChapter } from '../store/progress';
import { goBackOrHome } from '../utils/navigation';

export default function ChapterListScreen() {
 const insets = useSafeAreaInsets();
 const lastRead = useLastReadChapter();
 const [newestFirst, setNewestFirst] = useState(true);
 const [query, setQuery] = useState('');
 const { items, loading, error, reload } = useChapters();

 const list = useMemo(() => {
 const base = newestFirst ? [...items].reverse() : items;
 const keyword = query.trim().toLowerCase();
 if (!keyword) return base;

 return base.filter(
 (chapter) =>
 String(chapter.index).includes(keyword) || chapter.title.toLowerCase().includes(keyword)
 );
 }, [items, newestFirst, query]);

 const jumpToFirstMatch = () => {
 const target = list[0];
 if (target) router.push(`/read?chapter=${target.id}`);
 };

 return (
 <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
 <View className="flex-row items-center px-4 py-3">
 <Pressable hitSlop={10} className="active:opacity-60" onPress={goBackOrHome}>
 <Ionicons name="arrow-back" size={22} color="#111827" />
 </Pressable>
 <View className="ml-3 flex-1">
 <Text className="text-[17px] font-bold text-ink">Danh sách chương</Text>
 <Text className="text-[11px] text-ink-muted" numberOfLines={1}>
 {comic.title} • {loading ? '...' : `${items.length} chương`}
 </Text>
 </View>
 <Pressable
 hitSlop={8}
 className="flex-row items-center rounded-full bg-surface px-3 py-1.5 active:opacity-70"
 onPress={() => setNewestFirst(!newestFirst)}
 >
 <Ionicons name="swap-vertical" size={14} color="#111827" />
 <Text className="ml-1 text-[11px] font-semibold text-ink">
 {newestFirst ? 'Mới nhất' : 'Cũ nhất'}
 </Text>
 </Pressable>
 </View>

 <View className="px-4 pb-2">
 <View className="flex-row items-center rounded-xl bg-surface px-3">
 <Ionicons name="search" size={16} color="#9CA3AF" />
 <TextInput
 value={query}
 onChangeText={setQuery}
 placeholder="Tìm hoặc nhập số chương..."
 placeholderTextColor="#9CA3AF"
 keyboardType="number-pad"
 returnKeyType="go"
 onSubmitEditing={jumpToFirstMatch}
 className="ml-2 flex-1 py-2.5 text-[13px] text-ink"
 />
 {query ? (
 <Pressable hitSlop={8} onPress={() => setQuery('')}>
 <Ionicons name="close-circle" size={16} color="#9CA3AF" />
 </Pressable>
 ) : null}
 </View>
 </View>

 {loading ? (
 <View className="px-4">
 {[0, 1, 2, 3, 4].map((row) => (
 <View key={row} className="py-3">
 <Skeleton height={10} width="30%" radius={4} />
 <Skeleton height={14} width="65%" radius={6} style={{ marginTop: 8 }} />
 </View>
 ))}
 </View>
 ) : error ? (
 <View className="flex-1 items-center justify-center px-8">
 <Ionicons name="cloud-offline-outline" size={36} color="#9CA3AF" />
 <Text className="mt-3 text-center text-[13px] text-ink-muted">{error}</Text>
 <Pressable
 className="mt-4 rounded-full bg-brand px-6 py-2.5 active:opacity-80"
 onPress={() => reload()}
 >
 <Text className="text-[13px] font-semibold text-white">Thử lại</Text>
 </Pressable>
 </View>
 ) : (
 <ScrollView
 showsVerticalScrollIndicator={false}
 contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
 >
 {list.map((chapter) => {
 const read = lastRead >= chapter.index;
 return (
 <Pressable
 key={chapter.id}
 className={`px-4 py-3 active:opacity-60 ${
 chapter.index === lastRead ? 'bg-brand-soft' : 'bg-white'
 }`}
 onPress={() => router.push(`/read?chapter=${chapter.id}`)}
 >
 <View className="flex-row items-center justify-between">
 <View className="flex-1">
 <Text className="text-[11px] text-ink-faint">
 Chương {chapter.index} • {chapter.pages} trang
 </Text>
 <Text numberOfLines={1} className="mt-0.5 text-[14px] font-semibold text-ink">
 {chapter.title}
 </Text>
 </View>
 {read ? (
 <View className="flex-row items-center">
 <Text className="mr-1 text-[10px] font-semibold text-brand">Đã đọc</Text>
 <Ionicons name="checkmark-circle" size={16} color="#2F6BFF" />
 </View>
 ) : (
 <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
 )}
 </View>
 </Pressable>
 );
 })}
 </ScrollView>
 )}
 </View>
 );
}
```

# commic — Man trang truyen

> Phan `07-home` · 262 dong

## `src/app/home.tsx`

```tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import {
 ActivityIndicator,
 Image,
 Pressable,
 RefreshControl,
 ScrollView,
 Share,
 Text,
 useWindowDimensions,
 View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Skeleton } from '../components/Skeleton';
import { comic } from '../data/mock';
import { useChapters } from '../hooks/useChapters';
import { useLastReadChapter } from '../store/progress';

export default function HomeScreen() {
 const insets = useSafeAreaInsets();
 const { height } = useWindowDimensions();
 const lastRead = useLastReadChapter();
 const [expanded, setExpanded] = useState(false);
 const [refreshing, setRefreshing] = useState(false);
 const { items, loading, error, reload } = useChapters();

 const onRefresh = () => {
 setRefreshing(true);
 reload();
 setTimeout(() => setRefreshing(false), 900);
 };
 

 const total = items.length;
 const current = lastRead > 0 ? lastRead : 1;
 const percent = total > 0 ? Math.round((lastRead / total) * 100) : 0;
 const latest = [...items].slice(-3).reverse();

 return (
 <View className="flex-1 bg-white">
 <ScrollView
 showsVerticalScrollIndicator={false}
 contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
 refreshControl={
 <RefreshControl
 refreshing={refreshing}
 onRefresh={onRefresh}
 tintColor="#2F6BFF"
 colors={['#2F6BFF']}
 />
 }
 >
 {/* Hero cover */}
 <View style={{ height: height * 0.46 }}>
 <Image source={comic.cover} className="h-full w-full" resizeMode="cover" />
 <LinearGradient
 colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.05)', '#FFFFFF']}
 locations={[0, 0.55, 1]}
 style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
 />

 <View
 style={{
 position: 'absolute',
 right: 16,
 top: insets.top + 8,
 flexDirection: 'row',
 gap: 8,
 }}
 >
 <Pressable
 hitSlop={8}
 style={{
 width: 36,
 height: 36,
 borderRadius: 18,
 backgroundColor: 'rgba(0,0,0,0.4)',
 alignItems: 'center',
 justifyContent: 'center',
 }}
 onPress={() => Share.share({ message: `${comic.title} — đọc ngay trên Comic Plunder` })}
 >
 <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
 </Pressable>
 <Pressable
 hitSlop={8}
 style={{
 width: 36,
 height: 36,
 borderRadius: 18,
 backgroundColor: 'rgba(0,0,0,0.4)',
 alignItems: 'center',
 justifyContent: 'center',
 }}
 onPress={() => router.push('/settings')}
 >
 <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
 </Pressable>
 </View>

 <View className="absolute bottom-4 left-4 right-4">
 <View className="mb-2 flex-row items-center gap-2">
 <View className="rounded-md bg-brand px-2 py-0.5">
 <Text className="text-[10px] font-bold text-white">{comic.status}</Text>
 </View>
 <View className="flex-row items-center">
 <Ionicons name="star" size={12} color="#F59E0B" />
 <Text className="ml-1 text-[11px] font-semibold text-ink">{comic.rating}</Text>
 <Text className="ml-1 text-[10px] text-ink-muted">({comic.reviews})</Text>
 </View>
 <Text className="text-[10px] text-ink-muted">
 • {loading ? '...' : `${total} chương`}
 </Text>
 </View>
 <Text className="text-[24px] font-extrabold leading-8 text-ink">{comic.title}</Text>
 <Text className="mt-0.5 text-[11px] text-ink-muted">Tác giả: {comic.author}</Text>
 </View>
 </View>

 <View className="px-4">
 {/* Genres */}
 <View className="mt-1 flex-row flex-wrap gap-2">
 {comic.genres.map((genre) => (
 <View key={genre} className="rounded-full bg-brand-soft px-2.5 py-1">
 <Text className="text-[11px] font-semibold text-brand">{genre}</Text>
 </View>
 ))}
 </View>

 {/* Primary actions */}
 <Pressable
 className="mt-4 flex-row items-center justify-center rounded-2xl bg-brand py-3.5 active:opacity-80"
 onPress={() => router.push(`/read?chapter=ch-${current}`)}
 >
 <Ionicons name="play" size={16} color="#FFFFFF" />
 <Text className="ml-2 text-[15px] font-bold text-white">
 {lastRead > 0 ? `Đọc tiếp chương ${current}` : 'Đọc từ đầu'}
 </Text>
 </Pressable>

 <View className="mt-2 flex-row gap-2">
 <Pressable
 className="flex-1 flex-row items-center justify-center rounded-2xl border border-slate-200 py-3 active:opacity-70"
 onPress={() => router.push('/chapters')}
 >
 <Ionicons name="list-outline" size={16} color="#111827" />
 <Text className="ml-2 text-[13px] font-semibold text-ink">Danh sách chương</Text>
 </Pressable>
 <Pressable
 className="flex-row items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 active:opacity-70"
 onPress={() => router.push(`/read?chapter=ch-${lastRead > 0 ? lastRead : 1}`)}
 >
 <Ionicons name="bookmark-outline" size={16} color="#111827" />
 </Pressable>
 </View>

 {/* Progress */}
 <View className="mt-4 rounded-2xl bg-surface px-3.5 py-3">
 <View className="flex-row items-center justify-between">
 <Text className="text-[11px] font-semibold text-ink-muted">
 {lastRead > 0 ? `Đã đọc đến chương ${lastRead}/${total}` : 'Chưa bắt đầu đọc'}
 </Text>
 <Text className="text-[11px] font-bold text-brand">{percent}%</Text>
 </View>
 <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
 <View className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
 </View>
 </View>

 {/* Synopsis */}
 <View className="mt-5">
 <Text className="text-[14px] font-bold text-ink">Giới thiệu</Text>
 <Text
 numberOfLines={expanded ? undefined : 3}
 className="mt-1.5 text-[13px] leading-5 text-ink-muted"
 >
 {comic.description}
 </Text>
 <Pressable hitSlop={6} onPress={() => setExpanded(!expanded)} className="mt-1">
 <Text className="text-[12px] font-semibold text-brand">
 {expanded ? 'Thu gọn' : 'Xem thêm'}
 </Text>
 </Pressable>
 </View>

 {/* Chapters preview */}
 <View className="mt-5 flex-row items-center justify-between">
 <Text className="text-[14px] font-bold text-ink">Chương mới nhất</Text>
 <Pressable
 hitSlop={8}
 className="flex-row items-center active:opacity-60"
 onPress={() => router.push('/chapters')}
 >
 <Text className="text-[12px] text-ink-muted">Xem tất cả</Text>
 <Ionicons name="chevron-forward" size={14} color="#6B7280" />
 </Pressable>
 </View>
 {loading ? (
 <View className="mt-1">
 {[0, 1, 2].map((row) => (
 <View key={row} className="border-b border-slate-100 py-3">
 <Skeleton height={10} width="35%" radius={4} />
 <Skeleton height={14} width="70%" radius={6} style={{ marginTop: 8 }} />
 </View>
 ))}
 </View>
 ) : error ? (
 <Pressable
 className="mt-3 flex-row items-center justify-between rounded-xl bg-surface px-3.5 py-3 active:opacity-70"
 onPress={() => reload()}
 >
 <Text className="flex-1 text-[12px] text-ink-muted" numberOfLines={2}>
 {error} — kiểm tra backend đã chạy chưa?
 </Text>
 <Text className="ml-2 text-[12px] font-semibold text-brand">Thử lại</Text>
 </Pressable>
 ) : (
 <View className="mt-1">
 {latest.map((chapter, index) => {
 const read = lastRead >= chapter.index;
 return (
 <Pressable
 key={chapter.id}
 className="flex-row items-center justify-between border-b border-slate-100 py-3 active:opacity-60"
 onPress={() => router.push(`/read?chapter=${chapter.id}`)}
 >
 <View className="flex-1">
 <View className="flex-row items-center">
 <Text className="text-[11px] text-ink-faint">
 Chương {chapter.index} • {chapter.pages} trang
 </Text>
 {index === 0 ? (
 <View className="ml-2 rounded bg-brand px-1.5 py-[1px]">
 <Text className="text-[9px] font-bold text-white">MỚI</Text>
 </View>
 ) : null}
 </View>
 <Text numberOfLines={1} className="text-[14px] font-semibold text-ink">
 {chapter.title}
 </Text>
 </View>
 {read ? (
 <Ionicons name="checkmark-circle" size={16} color="#2F6BFF" />
 ) : (
 <View className="h-2 w-2 rounded-full bg-brand" />
 )}
 </Pressable>
 );
 })}
 </View>
 )}
 </View>
 </ScrollView>
 </View>
 );
}
```

# commic — Trinh doc — phan logic

> Phan `08-read-part1` · 144 dong

## `src/app/read.tsx` (dong 1-144)

```tsx
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import {
 ActivityIndicator,
 Image,
 Modal,
 type NativeScrollEvent,
 type NativeSyntheticEvent,
 Pressable,
 ScrollView,
 Text,
 useWindowDimensions,
 View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getChapterPages, type ChapterPayload } from '../api/chapters';
import { FadeInImage } from '../components/FadeInImage';
import { comic } from '../data/mock';
import { goBackOrHome } from '../utils/navigation';
import { useChapters } from '../hooks/useChapters';
import { readingProgress } from '../store/progress';

export default function ReaderScreen() {
 const { chapter } = useLocalSearchParams<{ chapter?: string }>();
 const insets = useSafeAreaInsets();
 const { width } = useWindowDimensions();
 const { items } = useChapters();

 const [showChapters, setShowChapters] = useState(false);
 const [dark, setDark] = useState(false);
 const [chromeVisible, setChromeVisible] = useState(true);
 const [scrollPct, setScrollPct] = useState(0);
 const [currentPage, setCurrentPage] = useState(1);
 const [payload, setPayload] = useState<ChapterPayload | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const lastPageRef = useRef(1);
 const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
 const restoredRef = useRef(false);
 const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

 const scheduleHideChrome = useCallback(() => {
 if (hideTimer.current) clearTimeout(hideTimer.current);
 hideTimer.current = setTimeout(() => setChromeVisible(false), 4000);
 }, []);

 useEffect(() => {
 scheduleHideChrome();
 return () => {
 if (hideTimer.current) clearTimeout(hideTimer.current);
 };
 }, [scheduleHideChrome]);

 const requestedIndex = Number(chapter?.replace('ch-', '')) || 1;
 const current = items.find((item) => item.index === requestedIndex) ?? {
 id: `ch-${requestedIndex}`,
 index: requestedIndex,
 title: `Chương ${requestedIndex}`,
 pages: 0,
 };

 const load = useCallback(
 (signal?: AbortSignal) => {
 setLoading(true);
 setError(null);
 getChapterPages(current.index, signal)
 .then((data) => {
 setPayload(data);
 setLoading(false);
 setScrollPct(0);

 // Giữ trang đã đọc nếu đang mở đúng chương dở dang
 const savedPage =
 readingProgress.get() === current.index ? readingProgress.getPage() : 1;
 lastPageRef.current = savedPage;
 setCurrentPage(savedPage);
 readingProgress.markRead(current.index, savedPage);
 })
 .catch((err: Error) => {
 if (err.name === 'AbortError') return;
 setError(err.message);
 setPayload(null);
 setLoading(false);
 });
 },
 [current.index]
 );

 useEffect(() => {
 const controller = new AbortController();
 load(controller.signal);
 return () => controller.abort();
 }, [load]);

 // Tải trước ảnh của chương kế tiếp để chuyển chương tức thì
 useEffect(() => {
 if (!payload) return;

 const next = items.find((item) => item.index === current.index + 1);
 if (!next) return;

 const controller = new AbortController();
 getChapterPages(next.index, controller.signal)
 .then((data) => {
 data.pages.forEach((page) => {
 Image.prefetch(page.url).catch(() => undefined);
 });
 })
 .catch(() => undefined);

 return () => controller.abort();
 }, [payload, current.index, items]);

 const aspect = payload?.aspectRatio ?? 1.445;

 const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
 const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
 const pageHeight = width * aspect;
 const pageCount = payload?.pageCount ?? 1;

 const page = Math.min(
 pageCount,
 Math.max(1, Math.floor(contentOffset.y / Math.max(1, pageHeight)) + 1)
 );
 if (page !== lastPageRef.current) {
 lastPageRef.current = page;
 setCurrentPage(page);
 readingProgress.markRead(current.index, page);
 }

 const scrollable = Math.max(1, contentSize.height - layoutMeasurement.height);
 setScrollPct(Math.min(1, Math.max(0, contentOffset.y / scrollable)));
 };

 const goTo = (index: number) => {
 const target = items.find((item) => item.index === index);
 if (target) router.setParams({ chapter: target.id });
 };

 const hasPrev = items.some((item) => item.index === current.index - 1);
 const hasNext = items.some((item) => item.index === current.index + 1);
```
# commic — Trinh doc — phan JSX

> Phan `09-read-part2` · 261 dong

## `src/app/read.tsx` (dong 145-405)

```tsx
 return (
 <View className={`flex-1 ${dark ? 'bg-black' : 'bg-white'}`} style={{ paddingTop: insets.top }}>
 <View className="flex-row items-center px-4 py-3">
 <Pressable
 hitSlop={12}
 className="h-9 w-9 items-center justify-center rounded-full active:opacity-60"
 style={{ backgroundColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }}
 onPress={goBackOrHome}
 >
 <Ionicons name="arrow-back" size={20} color={dark ? '#FFFFFF' : '#111827'} />
 </Pressable>
 <View className="ml-3 flex-1">
 <Text
 numberOfLines={1}
 className={`text-[14px] font-bold ${dark ? 'text-white' : 'text-ink'}`}
 >
 Chương {current.index}: {current.title}
 </Text>
 <Text className={`text-[10px] ${dark ? 'text-slate-400' : 'text-ink-faint'}`}>
 {comic.title}
 {payload ? ` • ${payload.pageCount} trang` : ''}
 </Text>
 </View>
 <Pressable
 hitSlop={12}
 className="h-9 w-9 items-center justify-center rounded-full active:opacity-60"
 style={{ backgroundColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }}
 onPress={() => setChromeVisible((visible) => !visible)}
 >
 <Ionicons
 name={chromeVisible ? 'chevron-down' : 'chevron-up'}
 size={18}
 color={dark ? '#FFFFFF' : '#111827'}
 />
 </Pressable>
 </View>

 <View className="flex-1">
 {!loading && !error ? (
 <View
 pointerEvents="none"
 style={{
 position: 'absolute',
 top: 0,
 left: 0,
 right: 0,
 height: 3,
 backgroundColor: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
 zIndex: 10,
 }}
 >
 <View
 style={{
 height: 3,
 width: `${Math.round(scrollPct * 100)}%`,
 backgroundColor: '#2F6BFF',
 }}
 />
 </View>
 ) : null}
 {loading ? (
 <View className="flex-1 items-center justify-center">
 <ActivityIndicator color="#2F6BFF" />
 <Text className={`mt-3 text-[12px] ${dark ? 'text-slate-400' : 'text-ink-muted'}`}>
 Đang tải chương {current.index}...
 </Text>
 </View>
 ) : error ? (
 <View className="flex-1 items-center justify-center px-8">
 <Ionicons name="cloud-offline-outline" size={40} color="#9CA3AF" />
 <Text
 className={`mt-3 text-center text-[14px] font-semibold ${
 dark ? 'text-white' : 'text-ink'
 }`}
 >
 {error}
 </Text>
 <Text
 className={`mt-1 text-center text-[11px] ${
 dark ? 'text-slate-400' : 'text-ink-muted'
 }`}
 >
 Kiểm tra backend đã chạy chưa (port 3000) rồi thử lại.
 </Text>
 <Pressable
 className="mt-4 rounded-full bg-brand px-6 py-2.5 active:opacity-80"
 onPress={() => load()}
 >
 <Text className="text-[13px] font-semibold text-white">Thử lại</Text>
 </Pressable>
 </View>
 ) : (
 <ScrollView
 ref={scrollRef}
 style={{ flex: 1 }}
 showsVerticalScrollIndicator={false}
 contentContainerStyle={{ paddingBottom: 88 }}
 onScroll={onScroll}
 scrollEventThrottle={16}
 onContentSizeChange={() => {
 if (restoredRef.current || !payload) return;
 restoredRef.current = true;

 const savedPage = lastPageRef.current;
 if (savedPage > 1) {
 scrollRef.current?.scrollTo({
 y: (savedPage - 1) * width * aspect,
 animated: false,
 });
 }
 }}
 >
 <Pressable
 onPress={() => {
 setChromeVisible((visible) => !visible);
 scheduleHideChrome();
 }}
 >
 {payload?.pages.map((page) => (
 <FadeInImage
 key={page.index}
 uri={page.url}
 width={width}
 height={width * aspect}
 dark={dark}
 />
 ))}
 </Pressable>

 <View className="items-center px-4 py-8">
 <Text
 className={`text-[13px] font-semibold ${dark ? 'text-slate-400' : 'text-ink-faint'}`}
 >
 Hết chương {current.index}
 </Text>
 <View className="mt-3 flex-row gap-3">
 <Pressable
 className="rounded-full bg-brand-soft px-5 py-2.5 active:opacity-70"
 onPress={() => goTo(current.index - 1)}
 >
 <Text className="text-[13px] font-semibold text-brand">Chương trước</Text>
 </Pressable>
 <Pressable
 className="rounded-full bg-brand px-5 py-2.5 active:opacity-80"
 onPress={() => goTo(current.index + 1)}
 >
 <Text className="text-[13px] font-semibold text-white">Chương sau</Text>
 </Pressable>
 </View>
 </View>
 </ScrollView>
 )}

 {/* Floating prev/next */}
 {!loading && !error ? (
 <View
 pointerEvents="box-none"
 style={{ position: 'absolute', left: 0, right: 0, bottom: 16 }}
 className="flex-row items-center justify-between px-4"
 >
 <Pressable
 onPress={() => goTo(current.index - 1)}
 disabled={!hasPrev}
 hitSlop={8}
 style={{ opacity: hasPrev ? 1 : 0.3 }}
 className="h-11 w-11 items-center justify-center rounded-full bg-black/60 active:opacity-70"
 >
 <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
 </Pressable>

 <View className="rounded-full bg-black/60 px-3 py-1.5">
 <Text className="text-[11px] font-semibold text-white">
 Ch.{current.index} · {currentPage}/{payload?.pageCount ?? '?'}
 </Text>
 </View>

 <Pressable
 onPress={() => goTo(current.index + 1)}
 disabled={!hasNext}
 hitSlop={8}
 style={{ opacity: hasNext ? 1 : 0.3 }}
 className="h-11 w-11 items-center justify-center rounded-full bg-black/60 active:opacity-70"
 >
 <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
 </Pressable>
 </View>
 ) : null}
 </View>

 {/* Bottom bar */}
 <View
 className={`flex-row items-stretch border-t ${
 dark ? 'border-white/10 bg-black' : 'border-slate-100 bg-white'
 }`}
 style={{
 paddingBottom: Math.max(insets.bottom, 8),
 flexShrink: 0,
 display: chromeVisible ? 'flex' : 'none',
 }}
 >
 {[
 { icon: 'book-outline', label: 'Chương', onPress: () => setShowChapters(true) },
 {
 icon: dark ? 'sunny-outline' : 'moon-outline',
 label: 'Chế độ tối',
 onPress: () => setDark(!dark),
 },
 { icon: 'chatbubbles-outline', label: 'Thảo luận', onPress: () => undefined },
 { icon: 'settings-outline', label: 'Cài đặt', onPress: () => router.push('/settings') },
 ].map((item) => (
 <Pressable
 key={item.label}
 className="flex-1 items-center justify-center py-2 active:opacity-60"
 onPress={item.onPress}
 >
 <Ionicons name={item.icon as never} size={20} color={dark ? '#E5E7EB' : '#111827'} />
 <Text className={`mt-1 text-[10px] ${dark ? 'text-slate-300' : 'text-ink-muted'}`}>
 {item.label}
 </Text>
 </Pressable>
 ))}
 </View>

 {/* Chapter picker */}
 <Modal
 visible={showChapters}
 animationType="slide"
 transparent
 onRequestClose={() => setShowChapters(false)}
 >
 <Pressable className="flex-1 bg-black/40" onPress={() => setShowChapters(false)} />
 <View className="max-h-[60%] rounded-t-[24px] bg-white pb-6" style={{ marginTop: -8 }}>
 <View className="items-center py-3">
 <View className="h-1 w-10 rounded-full bg-slate-200" />
 </View>
 <Text className="px-4 pb-2 text-[16px] font-bold text-ink">Chương</Text>
 <ScrollView>
 {items.map((c) => (
 <Pressable
 key={c.id}
 className={`px-4 py-3 active:opacity-60 ${
 c.id === current.id ? 'bg-brand-soft' : 'bg-white'
 }`}
 onPress={() => {
 setShowChapters(false);
 router.setParams({ chapter: c.id });
 }}
 >
 <Text className="text-[11px] text-ink-faint">
 Chương {c.index} • {c.pages} trang
 </Text>
 <Text className="mt-0.5 text-[14px] font-semibold text-ink">{c.title}</Text>
 </Pressable>
 ))}
 </ScrollView>
 </View>
 </Modal>
 </View>
 );
}
```


