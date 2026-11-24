import { Ionicons } from "@expo/vector-icons";
import { useKeepAwake } from "expo-keep-awake";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ComponentRef,
} from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  type GestureResponderEvent,
  Modal,
  type NativeScrollEvent,
  PanResponder,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getChapterPages, type ChapterPayload } from "../api/chapters";
import { getManifest } from "../api/manifest";
import {
  getPageRatios,
  loadPageRatios,
  pageKey,
  setPageRatio,
} from "../api/pageSizes";
import {
  DEFAULT_READER_PREFS,
  getReaderPrefs,
  setLastSeenChapter,
  setReaderPrefs,
  type ReaderPrefs,
  type ReaderTheme,
} from "../api/prefs";
import {
  getReadChapters,
  markChapterRead,
  saveProgress,
} from "../api/progress";
import { isPageSaved, removeSavedPage, savePage } from "../api/saved";
import { CHAPTER_ROW_HEIGHT, ChapterRow } from "../components/ChapterRow";
import { FadeInImage } from "../components/FadeInImage";
import { Button } from "../components/ui/Button";
import { Text } from "../components/ui/Text";
import { comic } from "../data/mock";
import { getChapterImageUrl } from "../data/r2";
import { useChapters } from "../hooks/useChapters";
import { haptic } from "../native/haptics";
import { prefetchImages } from "../native/image";
import { sharePage } from "../native/share";
import { colors } from "../theme/tokens";
import { goBackOrHome } from "../utils/navigation";

const HEADER_HEIGHT = 56;
const BAR_HEIGHT = 60;
/** Kéo quá cuối chương bao nhiêu px thì sang chương sau */
const PULL_NEXT = 80;
/** Pinch / double-tap zoom chỉ có trên iOS (ScrollView native) */
const CAN_ZOOM = Platform.OS === "ios";
const DOUBLE_TAP_MS = 260;
/** Lazy load: chỉ gắn ảnh cho các trang trong khoảng này quanh trang đang đọc */
const LAZY_BEHIND = 3;
const LAZY_AHEAD = 5;
/** Vuốt ngang: phải kéo quá ngưỡng này (tỉ lệ bề rộng màn hình, tối đa px) mới chuyển chương */
const SWIPE_TRIGGER_RATIO = 0.3;
const SWIPE_TRIGGER_MAX = 140;
/** Bắt đầu nhận là vuốt ngang khi dx vượt ngưỡng này và ngang gấp đôi dọc */
const SWIPE_START = 14;

type Palette = {
  bg: string;
  bar: string;
  line: string;
  text: string;
  muted: string;
  placeholder: string;
  statusBar: "light" | "dark";
  label: string;
};

const PALETTES: Record<ReaderTheme, Palette> = {
  dark: {
    bg: colors.night.DEFAULT,
    bar: colors.night.raised,
    line: colors.night.line,
    text: colors.night.text,
    muted: colors.night.muted,
    placeholder: colors.night.raised,
    statusBar: "light",
    label: "Tối",
  },
  sepia: {
    bg: colors.sepia.DEFAULT,
    bar: colors.sepia.raised,
    line: colors.sepia.line,
    text: colors.ink.DEFAULT,
    muted: colors.muted,
    placeholder: colors.sepia.raised,
    statusBar: "dark",
    label: "Giấy",
  },
  light: {
    bg: colors.paper.DEFAULT,
    bar: colors.paper.DEFAULT,
    line: colors.line,
    text: colors.ink.DEFAULT,
    muted: colors.muted,
    placeholder: colors.paper.deep,
    statusBar: "dark",
    label: "Sáng",
  },
};

const DIM_STEPS = [
  { value: 0, label: "Tắt" },
  { value: 0.2, label: "20%" },
  { value: 0.4, label: "40%" },
  { value: 0.6, label: "60%" },
];

const SCROLL_STEPS = [
  { value: 0, label: "Tắt" },
  { value: 30, label: "Chậm" },
  { value: 60, label: "Vừa" },
  { value: 110, label: "Nhanh" },
];

/** Nhóm nút chọn một trong nhiều */
function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View className="mt-2 flex-row overflow-hidden rounded-sm border border-ink">
      {options.map((option, i) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={`h-11 flex-1 items-center justify-center ${selected ? "bg-ink" : "active:bg-paper-deep"} ${
              i > 0 ? "border-l border-ink" : ""
            }`}
          >
            <Text variant="label" tone={selected ? "paper" : "ink"}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function ReaderScreen() {
  useKeepAwake();

  const params = useLocalSearchParams<{ chapter?: string; page?: string }>();
  const insets = useSafeAreaInsets();
  const { width, height: screenHeight } = useWindowDimensions();
  const { items } = useChapters();

  const [prefs, setPrefs] = useState<ReaderPrefs>(DEFAULT_READER_PREFS);
  const [showChapters, setShowChapters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [readSet, setReadSet] = useState<Set<number>>(new Set());
  const [chromeVisible, setChromeVisible] = useState(true);
  const [scrollPct, setScrollPct] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [payload, setPayload] = useState<ChapterPayload | null>(null);
  // Tỉ lệ cao/rộng thật của từng trang ("chương:trang" → h/w); chưa biết thì dùng tỉ lệ mặc định
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const palette = PALETTES[prefs.theme];
  const lastPageRef = useRef(1);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chrome = useRef(new Animated.Value(1)).current;
  // Vị trí cuộn / zoom hiện tại (toạ độ đã phóng to), dùng cho zoom + tự cuộn
  const offsetRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const contentHeightRef = useRef(0);
  const touchingRef = useRef(false);
  const autoNextFiredRef = useRef<number | null>(null);

  const requestedIndex =
    Number(params.chapter?.replace("ch-", "")) || items[0]?.index || 1;
  const current = items.find((item) => item.index === requestedIndex) ?? {
    id: `ch-${requestedIndex}`,
    index: requestedIndex,
    title: null,
    pages: 0,
  };

  // Trang cần cuộn tới khi mở từ "Đọc tiếp" / trang đã lưu — chỉ dùng một lần
  const resumeRef = useRef<{ chapter: number; page: number } | null>(
    Number(params.page) > 1
      ? { chapter: requestedIndex, page: Number(params.page) }
      : null,
  );

  // Chương liền trước/sau trong danh sách (các chương không liên tục, vd 472 → 510)
  const position = items.findIndex((item) => item.index === current.index);
  const prevChapter = position > 0 ? items[position - 1] : undefined;
  const nextChapter = position >= 0 ? items[position + 1] : undefined;

  useEffect(() => {
    getReaderPrefs().then(setPrefs);
  }, []);

  const updatePrefs = (patch: Partial<ReaderPrefs>) => {
    haptic.tap();
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      setReaderPrefs(next);
      return next;
    });
  };

  const goTo = useCallback((target?: { id: string }) => {
    if (!target) return;
    haptic.light();
    router.setParams({ chapter: target.id });
  }, []);

  // ---- Thanh điều khiển (header + bottom bar) trượt ẩn/hiện ----
  useEffect(() => {
    Animated.timing(chrome, {
      toValue: chromeVisible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [chromeVisible, chrome]);

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

  // ---- Tải chương ----
  const load = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      offsetRef.current = { x: 0, y: 0 };
      zoomRef.current = 1;
      Promise.all([getChapterPages(current.index, signal), loadPageRatios()])
        .then(([data]) => {
          if (signal?.aborted) return;
          const resume = resumeRef.current;
          const startPage =
            resume && resume.chapter === current.index
              ? Math.min(resume.page, data.pageCount)
              : 1;
          // Tỉ lệ đã biết từ lần đọc trước → layout đúng ngay, nhảy tới trang đọc dở chính xác
          setRatios(getPageRatios(data.chapter, data.pageCount));
          setPayload(data);
          setLoading(false);
          setScrollPct(0);
          lastPageRef.current = startPage;
          setCurrentPage(startPage);
          setLastSeenChapter(current.index);
        })
        .catch((err: Error) => {
          if (err.name === "AbortError") return;
          setError(err.message);
          setPayload(null);
          setLoading(false);
        });
    },
    [current.index],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // Tải trước vài trang đầu của chương kế tiếp để chuyển chương tức thì
  useEffect(() => {
    if (!payload || !nextChapter) return;
    const controller = new AbortController();
    getChapterPages(nextChapter.index, controller.signal)
      .then((data) => {
        if (!data.offline)
          prefetchImages(data.pages.slice(0, 3).map((p) => p.url));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [payload, nextChapter]);

  // ---- Lưu tiến độ (debounce khi đổi trang) ----
  useEffect(() => {
    if (!payload || payload.chapter !== current.index) return;
    const timer = setTimeout(
      () => saveProgress(current.index, currentPage),
      600,
    );
    return () => clearTimeout(timer);
  }, [payload, current.index, currentPage]);

  // ---- Đánh dấu đã đọc: dừng ở trang cuối 1.5s, hoặc cuộn tới phần "Hết chương" ----
  const markedRef = useRef<number | null>(null);
  const markRead = useCallback(() => {
    if (markedRef.current === current.index) return;
    markedRef.current = current.index;
    markChapterRead(current.index);
  }, [current.index]);

  useEffect(() => {
    if (!payload || currentPage < payload.pageCount) return;
    const timer = setTimeout(markRead, 1500);
    return () => clearTimeout(timer);
  }, [payload, currentPage, markRead]);

  useEffect(() => {
    if (payload && scrollPct >= 0.98) markRead();
  }, [payload, scrollPct, markRead]);

  const aspect = payload?.aspectRatio ?? 1.445;
  const contentTop = insets.top + HEADER_HEIGHT;

  // Chiều cao + vị trí đầu mỗi trang theo tỉ lệ thật (ảnh dài cả chương cao gấp hàng chục lần trang thường)
  const layout = useMemo(() => {
    const heights: number[] = [];
    const offsets: number[] = [];
    let y = 0;
    for (const page of payload?.pages ?? []) {
      const h =
        width * (ratios[pageKey(payload!.chapter, page.index)] ?? aspect);
      offsets.push(y);
      heights.push(h);
      y += h;
    }
    return { heights, offsets };
  }, [payload, ratios, width, aspect]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const onPageSize = useCallback(
    (chapter: number, page: number, w: number, h: number) => {
      const key = pageKey(chapter, page);
      const ratio = h / w;
      setPageRatio(key, ratio);
      setRatios((prev) =>
        prev[key] && Math.abs(prev[key] - ratio) < 0.001
          ? prev
          : { ...prev, [key]: ratio },
      );
    },
    [],
  );

  /** Trang chứa toạ độ y (tính từ đầu trang 1, tỉ lệ zoom 1) */
  const pageAt = (y: number) => {
    const { offsets } = layoutRef.current;
    let lo = 0;
    let hi = offsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (offsets[mid] <= y) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };

  // ---- Tự cuộn ----
  useEffect(() => {
    if (!prefs.autoScroll || loading || error || showSettings || showChapters)
      return;

    let raf = 0;
    let last = 0;
    const step = (t: number) => {
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;

      if (!touchingRef.current && dt > 0) {
        const max = Math.max(0, contentHeightRef.current - screenHeight);
        const y = offsetRef.current.y;
        if (y < max - 1) {
          const nextY = Math.min(
            max,
            y + prefs.autoScroll * zoomRef.current * dt,
          );
          offsetRef.current.y = nextY;
          scrollRef.current?.scrollTo({
            x: offsetRef.current.x,
            y: nextY,
            animated: false,
          });
        } else if (
          prefs.autoNext &&
          nextChapter &&
          autoNextFiredRef.current !== current.index
        ) {
          autoNextFiredRef.current = current.index;
          setTimeout(() => goTo(nextChapter), 1500);
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [
    prefs.autoScroll,
    prefs.autoNext,
    loading,
    error,
    showSettings,
    showChapters,
    screenHeight,
    nextChapter,
    current.index,
    goTo,
  ]);

  const onContentSizeChange = (_w: number, h: number) => {
    contentHeightRef.current = h;
    const resume = resumeRef.current;
    if (!resume || !payload || resume.chapter !== payload.chapter) return;
    resumeRef.current = null;
    const y = layoutRef.current.offsets[resume.page - 1] ?? 0;
    offsetRef.current.y = y;
    scrollRef.current?.scrollTo({ y, animated: false });
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement, zoomScale } =
      event.nativeEvent;
    const pageCount = payload?.pageCount ?? 1;
    // Khi pinch-zoom (iOS), offset tính theo toạ độ đã phóng to → quy về tỉ lệ 1
    const scale = zoomScale || 1;
    offsetRef.current = { x: contentOffset.x, y: contentOffset.y };
    zoomRef.current = scale;
    contentHeightRef.current = contentSize.height;

    // Trang đang nằm giữa màn hình
    const center =
      (contentOffset.y + layoutMeasurement.height / 2) / scale - contentTop;
    const page = Math.min(pageCount, Math.max(1, pageAt(center)));
    if (page !== lastPageRef.current) {
      lastPageRef.current = page;
      setCurrentPage(page);
    }

    // Chỉ cập nhật thanh tiến độ khi đổi ≥ 0.5% để khỏi re-render mỗi frame
    const scrollable = Math.max(
      1,
      contentSize.height - layoutMeasurement.height,
    );
    const pct = Math.min(1, Math.max(0, contentOffset.y / scrollable));
    setScrollPct((prev) =>
      Math.abs(prev - pct) >= 0.005 || pct >= 0.98 ? pct : prev,
    );
  };

  const onScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const overscroll =
      contentOffset.y - (contentSize.height - layoutMeasurement.height);
    if (prefs.autoNext && nextChapter && overscroll > PULL_NEXT)
      goTo(nextChapter);
  };

  // ---- Zoom bằng chạm hai lần (iOS) ----
  const zoomAt = (x: number, y: number) => {
    const view = scrollRef.current;
    if (!view) return;
    const scale = zoomRef.current;
    const offset = offsetRef.current;
    haptic.tap();

    if (scale > 1.05) {
      view.scrollResponderZoomTo({
        x: 0,
        y: offset.y / scale,
        width,
        height: screenHeight,
        animated: true,
      });
      return;
    }

    const target = 2.5;
    const cx = (x + offset.x) / scale;
    const cy = (y + offset.y) / scale;
    const w = width / target;
    const h = screenHeight / target;
    view.scrollResponderZoomTo({
      x: Math.max(0, cx - w / 2),
      y: Math.max(0, cy - h / 2),
      width: w,
      height: h,
      animated: true,
    });
  };

  // Nhận diện chạm / chạm hai lần mà không chiếm responder của ScrollView (để vẫn cuộn được)
  const touchRef = useRef({ x: 0, y: 0, t: 0, multi: false });
  const lastTapRef = useRef({ x: 0, y: 0, t: 0 });
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleChrome = () => {
    setChromeVisible((visible) => !visible);
    scheduleHideChrome();
  };

  const onTouchStart = (event: GestureResponderEvent) => {
    touchingRef.current = true;
    const { pageX, pageY, touches } = event.nativeEvent;
    if (touches.length > 1) {
      // Đang pinch-zoom: không coi là chạm
      touchRef.current.multi = true;
      return;
    }
    touchRef.current = { x: pageX, y: pageY, t: Date.now(), multi: false };
  };

  const onTouchEnd = (event: GestureResponderEvent) => {
    // Cho tự cuộn nghỉ một chút sau khi nhấc tay (để quán tính cuộn chạy xong)
    setTimeout(() => {
      touchingRef.current = false;
    }, 600);

    const { pageX, pageY } = event.nativeEvent;
    const start = touchRef.current;
    if (start.multi) return;
    const moved = Math.abs(pageX - start.x) + Math.abs(pageY - start.y);
    const now = Date.now();
    if (moved >= 10 || now - start.t >= 300) return;

    if (!CAN_ZOOM) {
      toggleChrome();
      return;
    }

    const last = lastTapRef.current;
    const isDouble =
      now - last.t < DOUBLE_TAP_MS &&
      Math.abs(pageX - last.x) + Math.abs(pageY - last.y) < 40;

    if (isDouble) {
      if (tapTimer.current) clearTimeout(tapTimer.current);
      lastTapRef.current = { x: 0, y: 0, t: 0 };
      zoomAt(pageX, pageY);
      return;
    }

    lastTapRef.current = { x: pageX, y: pageY, t: now };
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(toggleChrome, DOUBLE_TAP_MS);
  };

  // ---- Vuốt ngang để sang chương trước / sau ----
  // Chỉ chuyển khi kéo đủ xa (swipeTrigger); thả tay trước ngưỡng thì nội dung trượt về chỗ cũ
  const swipeTrigger = Math.min(width * SWIPE_TRIGGER_RATIO, SWIPE_TRIGGER_MAX);
  const swipeX = useRef(new Animated.Value(0)).current;
  const [swipeArmed, setSwipeArmed] = useState(false);
  const swipeStateRef = useRef({ armed: false });
  const swipeCtx = useRef({ prevChapter, nextChapter, swipeTrigger, goTo });
  swipeCtx.current = { prevChapter, nextChapter, swipeTrigger, goTo };

  useEffect(() => {
    swipeX.setValue(0);
    swipeStateRef.current.armed = false;
    setSwipeArmed(false);
  }, [current.index, swipeX]);

  const swipeResponder = useRef(
    PanResponder.create({
      // Capture ở view cha để giành cử chỉ ngang từ ScrollView dọc; đang zoom thì để ScrollView kéo ngang
      onMoveShouldSetPanResponderCapture: (e, g) =>
        zoomRef.current <= 1.01 &&
        e.nativeEvent.touches.length <= 1 &&
        Math.abs(g.dx) > SWIPE_START &&
        Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_e, g) => {
        const {
          prevChapter: prev,
          nextChapter: next,
          swipeTrigger: trigger,
        } = swipeCtx.current;
        // Không có chương theo hướng đó → kéo rất nặng, không bao giờ đạt ngưỡng
        const hasTarget = g.dx > 0 ? !!prev : !!next;
        const dx = hasTarget ? g.dx : g.dx * 0.2;
        swipeX.setValue(dx);
        const armed = hasTarget && Math.abs(g.dx) >= trigger;
        if (armed !== swipeStateRef.current.armed) {
          swipeStateRef.current.armed = armed;
          setSwipeArmed(armed);
          if (armed) haptic.tap();
        }
      },
      onPanResponderRelease: (_e, g) => {
        const {
          prevChapter: prev,
          nextChapter: next,
          goTo: go,
        } = swipeCtx.current;
        const armed = swipeStateRef.current.armed;
        swipeStateRef.current.armed = false;
        setSwipeArmed(false);
        if (armed) {
          go(g.dx > 0 ? prev : next);
          return;
        }
        Animated.spring(swipeX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
        }).start();
      },
      onPanResponderTerminate: () => {
        swipeStateRef.current.armed = false;
        setSwipeArmed(false);
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  ).current;

  // Nội dung trượt theo tay nhưng có lực cản; chip báo chương hiện dần từ mép
  const contentShift = swipeX.interpolate({
    inputRange: [-width, 0, width],
    outputRange: [-width * 0.35, 0, width * 0.35],
  });
  const prevHintOpacity = swipeX.interpolate({
    inputRange: [0, swipeTrigger * 0.3, swipeTrigger],
    outputRange: [0, 0.5, 1],
    extrapolate: "clamp",
  });
  const prevHintShift = swipeX.interpolate({
    inputRange: [0, swipeTrigger],
    outputRange: [-48, 12],
    extrapolate: "clamp",
  });
  const nextHintOpacity = swipeX.interpolate({
    inputRange: [-swipeTrigger, -swipeTrigger * 0.3, 0],
    outputRange: [1, 0.5, 0],
    extrapolate: "clamp",
  });
  const nextHintShift = swipeX.interpolate({
    inputRange: [-swipeTrigger, 0],
    outputRange: [-12, 48],
    extrapolate: "clamp",
  });

  // ---- Nhấn giữ trang: lưu / chia sẻ ----
  const pageActions = async (pageIndex: number, url: string) => {
    haptic.light();
    const files = getManifest()[current.index] ?? [];
    const remoteUrl =
      files[pageIndex - 1] !== undefined
        ? getChapterImageUrl(current.index, files[pageIndex - 1])
        : url;
    const saved = await isPageSaved(current.index, pageIndex);

    const toggleSave = () => {
      if (saved) removeSavedPage(current.index, pageIndex);
      else {
        savePage({ chapter: current.index, page: pageIndex, url: remoteUrl });
        haptic.success();
      }
    };
    const share = () => {
      sharePage(url, current.index, pageIndex).catch(() =>
        Alert.alert("Không chia sẻ được", "Kiểm tra kết nối mạng rồi thử lại."),
      );
    };

    const title = `Chương ${current.index} · trang ${pageIndex}`;
    const saveLabel = saved ? "Bỏ lưu trang này" : "Lưu trang này";

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          options: [saveLabel, "Chia sẻ ảnh", "Huỷ"],
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) toggleSave();
          if (index === 1) share();
        },
      );
    } else {
      Alert.alert(title, undefined, [
        { text: "Huỷ", style: "cancel" },
        { text: "Chia sẻ", onPress: share },
        { text: saveLabel, onPress: toggleSave },
      ]);
    }
  };

  const openChapters = () => {
    getReadChapters().then((list) => setReadSet(new Set(list)));
    setShowChapters(true);
  };

  const headerTranslate = chrome.interpolate({
    inputRange: [0, 1],
    outputRange: [-(contentTop + 8), 0],
  });
  const barTranslate = chrome.interpolate({
    inputRange: [0, 1],
    outputRange: [BAR_HEIGHT + insets.bottom + 8, 0],
  });

  const barItems: {
    icon: ComponentProps<typeof Ionicons>["name"];
    label: string;
    onPress: () => void;
    disabled?: boolean;
  }[] = [
    {
      icon: "chevron-back",
      label: "Trước",
      onPress: () => goTo(prevChapter),
      disabled: !prevChapter,
    },
    { icon: "list", label: "Chương", onPress: openChapters },
    {
      icon: "options-outline",
      label: "Tuỳ chỉnh",
      onPress: () => setShowSettings(true),
    },
    {
      icon: "chevron-forward",
      label: "Sau",
      onPress: () => goTo(nextChapter),
      disabled: !nextChapter,
    },
  ];

  const subtitle = [
    payload ? `Trang ${currentPage}/${payload.pageCount}` : null,
    payload?.offline ? "Đã tải về máy" : comic.title,
    prefs.autoScroll ? "Tự cuộn" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View className="flex-1" style={{ backgroundColor: palette.bg }}>
      <StatusBar style={palette.statusBar} hidden={!chromeVisible} animated />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.seal.DEFAULT} />
          <Text
            variant="caption"
            className="mt-3"
            style={{ color: palette.muted }}
          >
            Đang tải chương {current.index}…
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons
            name="cloud-offline-outline"
            size={40}
            color={palette.muted}
          />
          <Text
            variant="labelLg"
            className="mt-3 text-center"
            style={{ color: palette.text }}
          >
            {error}
          </Text>
          <Text
            variant="body"
            className="mt-1 text-center"
            style={{ color: palette.muted }}
          >
            Kiểm tra kết nối mạng rồi thử lại.
          </Text>
          <Button
            label="Thử lại"
            className="mt-5 self-stretch"
            onPress={() => load()}
          />
        </View>
      ) : (
        <Animated.View
          style={{ flex: 1, transform: [{ translateX: contentShift }] }}
          {...swipeResponder.panHandlers}
        >
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            // Pinch-zoom để đọc chữ nhỏ (chỉ iOS; Android cần react-native-gesture-handler)
            minimumZoomScale={1}
            maximumZoomScale={CAN_ZOOM ? 3 : 1}
            bouncesZoom
            pinchGestureEnabled
            contentContainerStyle={{ paddingTop: contentTop }}
            // Trang phía trên tải xong và đổi chiều cao (ảnh dài) → giữ nguyên chỗ đang đọc
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            onScroll={onScroll}
            onContentSizeChange={onContentSizeChange}
            onScrollBeginDrag={() => setChromeVisible(false)}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollBegin={() => {
              touchingRef.current = true;
            }}
            onMomentumScrollEnd={() => {
              touchingRef.current = false;
            }}
            scrollEventThrottle={16}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {payload?.pages.map((page, i) =>
              // Lazy load: trang xa chỗ đang đọc chỉ là khung trống đúng chiều cao (ảnh đã tải nằm trong cache đĩa)
              page.index < currentPage - LAZY_BEHIND ||
              page.index > currentPage + LAZY_AHEAD ? (
                <View
                  key={page.url}
                  style={{
                    width,
                    height: layout.heights[i],
                    backgroundColor: palette.placeholder,
                  }}
                />
              ) : (
                <FadeInImage
                  key={page.url}
                  uri={page.url}
                  width={width}
                  height={layout.heights[i]}
                  onSize={(w, h) =>
                    onPageSize(payload.chapter, page.index, w, h)
                  }
                  background={palette.bg}
                  placeholder={palette.placeholder}
                  muted={palette.muted}
                  onLongPress={() => pageActions(page.index, page.url)}
                />
              ),
            )}

            {/* Cuối chương */}
            <View
              className="px-5 pt-10"
              style={{
                paddingBottom: insets.bottom + BAR_HEIGHT + 32,
                minHeight: screenHeight * 0.4,
              }}
            >
              <Text variant="overline" style={{ color: palette.muted }}>
                Hết chương {current.index}
              </Text>
              {nextChapter ? (
                <>
                  <Button
                    className="mt-4"
                    label={`Chương ${nextChapter.index}`}
                    hint={nextChapter.title ?? "Đọc chương tiếp theo"}
                    onPress={() => goTo(nextChapter)}
                  />
                  {prefs.autoNext ? (
                    <Text
                      variant="caption"
                      className="mt-2 text-center"
                      style={{ color: palette.muted }}
                    >
                      Kéo tiếp lên để sang chương sau
                    </Text>
                  ) : null}
                </>
              ) : (
                <>
                  <Text
                    variant="title"
                    className="mt-3"
                    style={{ color: palette.text }}
                  >
                    Bạn đã theo kịp chương mới nhất
                  </Text>
                  <Text
                    variant="body"
                    className="mt-1"
                    style={{ color: palette.muted }}
                  >
                    Chương mới sẽ xuất hiện ở trang truyện khi được cập nhật.
                  </Text>
                </>
              )}
              {prevChapter ? (
                <Pressable
                  accessibilityRole="button"
                  className="mt-3 flex-row items-center self-start py-2 active:opacity-60"
                  onPress={() => goTo(prevChapter)}
                >
                  <Ionicons name="arrow-back" size={16} color={palette.muted} />
                  <Text
                    variant="label"
                    className="ml-1.5"
                    style={{ color: palette.muted }}
                  >
                    Chương trước ({prevChapter.index})
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </ScrollView>
        </Animated.View>
      )}

      {/* Chip báo chương khi vuốt ngang */}
      {!loading && !error ? (
        <>
          {prevChapter ? (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                top: screenHeight / 2 - 24,
                opacity: prevHintOpacity,
                transform: [{ translateX: prevHintShift }],
              }}
            >
              <View
                className="h-12 flex-row items-center rounded-full px-4"
                style={{
                  backgroundColor: swipeArmed
                    ? colors.seal.DEFAULT
                    : palette.bar,
                }}
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={swipeArmed ? "#fff" : palette.text}
                />
                <Text
                  variant="label"
                  className="ml-1"
                  style={{ color: swipeArmed ? "#fff" : palette.text }}
                >
                  Chương {prevChapter.index}
                </Text>
              </View>
            </Animated.View>
          ) : null}
          {nextChapter ? (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                right: 0,
                top: screenHeight / 2 - 24,
                opacity: nextHintOpacity,
                transform: [{ translateX: nextHintShift }],
              }}
            >
              <View
                className="h-12 flex-row items-center rounded-full px-4"
                style={{
                  backgroundColor: swipeArmed
                    ? colors.seal.DEFAULT
                    : palette.bar,
                }}
              >
                <Text
                  variant="label"
                  className="mr-1"
                  style={{ color: swipeArmed ? "#fff" : palette.text }}
                >
                  Chương {nextChapter.index}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={swipeArmed ? "#fff" : palette.text}
                />
              </View>
            </Animated.View>
          ) : null}
        </>
      ) : null}

      {/* Giảm sáng ảnh khi đọc đêm */}
      {prefs.dim > 0 ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: "#000",
            opacity: prefs.dim,
          }}
        />
      ) : null}

      {/* Vạch tiến độ mảnh luôn hiện ở đáy khi đã ẩn thanh điều khiển */}
      {!loading && !error ? (
        <View
          pointerEvents="none"
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ backgroundColor: palette.line }}
        >
          <View
            className="h-0.5 bg-seal"
            style={{ width: `${Math.round(scrollPct * 100)}%` }}
          />
        </View>
      ) : null}

      {/* Header */}
      <Animated.View
        pointerEvents={chromeVisible ? "auto" : "none"}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          borderBottomWidth: 1,
          paddingTop: insets.top,
          backgroundColor: palette.bar,
          borderColor: palette.line,
          transform: [{ translateY: headerTranslate }],
        }}
      >
        <View
          className="flex-row items-center px-2"
          style={{ height: HEADER_HEIGHT }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            hitSlop={6}
            className="h-11 w-11 items-center justify-center rounded-sm active:opacity-60"
            onPress={goBackOrHome}
          >
            <Ionicons name="arrow-back" size={22} color={palette.text} />
          </Pressable>
          <View className="ml-1 flex-1">
            <Text
              variant="heading"
              numberOfLines={1}
              style={{ color: palette.text }}
            >
              Chương {current.index}
              {current.title ? ` · ${current.title}` : ""}
            </Text>
            <Text
              variant="caption"
              numberOfLines={1}
              style={{ color: palette.muted }}
            >
              {subtitle}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Bottom bar */}
      <Animated.View
        pointerEvents={chromeVisible ? "auto" : "none"}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: insets.bottom,
          backgroundColor: palette.bar,
          transform: [{ translateY: barTranslate }],
        }}
      >
        <View className="h-0.5" style={{ backgroundColor: palette.line }}>
          <View
            className="h-0.5 bg-seal"
            style={{ width: `${Math.round(scrollPct * 100)}%` }}
          />
        </View>
        <View className="flex-row" style={{ height: BAR_HEIGHT }}>
          {barItems.map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              disabled={item.disabled}
              onPress={() => {
                item.onPress();
                scheduleHideChrome();
              }}
              className="flex-1 items-center justify-center active:opacity-60"
              style={{ opacity: item.disabled ? 0.3 : 1 }}
            >
              <Ionicons name={item.icon} size={22} color={palette.text} />
              <Text
                variant="caption"
                className="mt-0.5"
                style={{ color: palette.muted }}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      {/* Tuỳ chỉnh đọc */}
      <Modal
        visible={showSettings}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSettings(false)}
      >
        <Pressable
          accessibilityLabel="Đóng"
          className="flex-1"
          style={{ backgroundColor: "rgba(14,13,11,0.4)" }}
          onPress={() => setShowSettings(false)}
        />
        <View
          className="bg-paper px-5 pt-2"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="flex-row items-center justify-between py-2">
            <Text variant="title">Tuỳ chỉnh</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng"
              className="-mr-3 h-11 w-11 items-center justify-center active:opacity-60"
              onPress={() => setShowSettings(false)}
            >
              <Ionicons name="close" size={22} color={colors.ink.DEFAULT} />
            </Pressable>
          </View>

          <Text variant="overline" tone="muted" className="mt-3">
            Nền
          </Text>
          <Segmented
            options={(["dark", "sepia", "light"] as ReaderTheme[]).map((t) => ({
              value: t,
              label: PALETTES[t].label,
            }))}
            value={prefs.theme}
            onChange={(theme) => updatePrefs({ theme })}
          />

          <Text variant="overline" tone="muted" className="mt-5">
            Giảm sáng ảnh
          </Text>
          <Segmented
            options={DIM_STEPS}
            value={prefs.dim}
            onChange={(dim) => updatePrefs({ dim })}
          />

          <Text variant="overline" tone="muted" className="mt-5">
            Tự cuộn
          </Text>
          <Segmented
            options={SCROLL_STEPS}
            value={prefs.autoScroll}
            onChange={(autoScroll) => updatePrefs({ autoScroll })}
          />
          <Text variant="caption" tone="muted" className="mt-1.5">
            Chạm hoặc kéo để tạm dừng, nhấc tay là chạy tiếp.
          </Text>

          <View className="mt-5 flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text variant="label">Tự sang chương sau</Text>
              <Text variant="caption" tone="muted">
                Kéo tiếp ở cuối chương, hoặc khi tự cuộn hết chương
              </Text>
            </View>
            <Switch
              value={prefs.autoNext}
              onValueChange={(autoNext) => updatePrefs({ autoNext })}
              trackColor={{ true: colors.seal.DEFAULT, false: colors.line }}
            />
          </View>

          <Text variant="caption" tone="muted" className="mt-6">
            Vuốt ngang đủ xa để sang chương trước / sau.{" "}
            {CAN_ZOOM ? "Chụm hai ngón hoặc chạm hai lần để phóng to. " : ""}
            Nhấn giữ một trang để lưu hoặc chia sẻ.
          </Text>
        </View>
      </Modal>

      {/* Chọn chương */}
      <Modal
        visible={showChapters}
        animationType="slide"
        transparent
        onRequestClose={() => setShowChapters(false)}
      >
        <Pressable
          accessibilityLabel="Đóng"
          className="flex-1"
          style={{ backgroundColor: "rgba(14,13,11,0.5)" }}
          onPress={() => setShowChapters(false)}
        />
        <View
          className="h-[70%] bg-paper"
          style={{ paddingBottom: insets.bottom }}
        >
          <View className="flex-row items-center justify-between border-b border-line py-2 pl-5 pr-2">
            <Text variant="title">Chương</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng"
              className="h-11 w-11 items-center justify-center active:opacity-60"
              onPress={() => setShowChapters(false)}
            >
              <Ionicons name="close" size={22} color={colors.ink.DEFAULT} />
            </Pressable>
          </View>
          <FlatList
            data={items}
            keyExtractor={(c) => c.id}
            initialScrollIndex={position > 2 ? position - 2 : 0}
            getItemLayout={(_, index) => ({
              length: CHAPTER_ROW_HEIGHT,
              offset: CHAPTER_ROW_HEIGHT * index,
              index,
            })}
            renderItem={({ item }) => (
              <ChapterRow
                chapter={item}
                active={item.id === current.id}
                read={readSet.has(item.index) && item.id !== current.id}
                onPress={() => {
                  setShowChapters(false);
                  goTo(item);
                }}
              />
            )}
          />
        </View>
      </Modal>
    </View>
  );
}
