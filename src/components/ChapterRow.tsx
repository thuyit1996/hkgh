import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import type { DownloadState } from '../api/offline';
import type { ChapterItem } from '../hooks/useChapters';
import { colors } from '../theme/tokens';
import { Seal } from './ui/Seal';
import { Text } from './ui/Text';

/** Chiều cao cố định để FlatList dùng getItemLayout / initialScrollIndex */
export const CHAPTER_ROW_HEIGHT = 68;

type Props = {
  chapter: ChapterItem;
  /** Trang đang đọc dở trong chương này (nếu là chương đang đọc) */
  currentPage?: number;
  read?: boolean;
  isNew?: boolean;
  /** Đang mở chương này (trong reader) */
  active?: boolean;
  /** Trạng thái tải offline */
  download?: DownloadState | null;
  onPress: () => void;
  onLongPress?: () => void;
};

function downloadText(state?: DownloadState | null): string | null {
  if (!state) return null;
  if (state.status === 'queued') return 'Chờ tải';
  if (state.status === 'downloading') return `Đang tải ${state.done}/${state.total}`;
  if (state.status === 'error') return 'Tải lỗi';
  return null;
}

export function ChapterRow({
  chapter,
  currentPage,
  read,
  isNew,
  active,
  download,
  onPress,
  onLongPress,
}: Props) {
  const reading = currentPage !== undefined;
  const primary = chapter.title ?? `${chapter.pages} trang`;

  let meta: string | null = chapter.title ? `${chapter.pages} trang` : null;
  if (reading) meta = `Đang đọc · trang ${currentPage}/${chapter.pages}`;
  else if (read) meta = chapter.title ? `${chapter.pages} trang · Đã đọc` : 'Đã đọc';
  const dl = downloadText(download);
  if (dl) meta = meta ? `${meta} · ${dl}` : dl;
  const offline = download?.status === 'done';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Chương ${chapter.index}${chapter.title ? `, ${chapter.title}` : ''}${
        meta ? `, ${meta}` : ''
      }`}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={{ height: CHAPTER_ROW_HEIGHT }}
      className={`flex-row items-center border-b border-line pr-4 active:bg-paper-deep ${
        active ? 'bg-paper-deep' : ''
      }`}
    >
      {/* Vạch đỏ đánh dấu chương đang đọc / đang mở */}
      <View
        className={`h-full w-1 ${reading || active ? 'bg-seal' : 'bg-transparent'}`}
      />
      <Text
        variant="numeral"
        tone={read && !reading ? 'faint' : 'ink'}
        className="w-[72px] pl-3"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {chapter.index}
      </Text>

      <View className="flex-1">
        <Text variant="label" tone={read && !reading ? 'muted' : 'ink'} numberOfLines={1}>
          {primary}
        </Text>
        {meta ? (
          <Text variant="caption" tone={reading ? 'seal' : 'muted'} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>

      {offline ? (
        <Ionicons
          name="arrow-down-circle"
          size={18}
          color={colors.muted}
          accessibilityLabel="Đã tải về máy"
          style={{ marginRight: 8 }}
        />
      ) : null}
      {isNew && !read ? <Seal label="Mới" tone="outline" /> : null}
      {read && !reading ? (
        <Ionicons name="checkmark" size={18} color={colors.faint} />
      ) : (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.faint}
          style={{ marginLeft: isNew ? 8 : 0 }}
        />
      )}
    </Pressable>
  );
}
