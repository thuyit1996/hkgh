import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import { Image, Pressable, ScrollView, Share, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { downloadChapters } from '../api/offline';
import { getLastSeenChapter, setLastSeenChapter } from '../api/prefs';
import { computeStreak, getReadingDays, getRealm } from '../api/stats';
import { ChapterRow } from '../components/ChapterRow';
import { Button } from '../components/ui/Button';
import { Seal } from '../components/ui/Seal';
import { Text } from '../components/ui/Text';
import { comic } from '../data/mock';
import { useChapters } from '../hooks/useChapters';
import { useDownloads } from '../hooks/useDownloads';
import { useReadingProgress } from '../hooks/useReadingProgress';
import { haptic } from '../native/haptics';
import { colors } from '../theme/tokens';

const OFFLINE_BATCH = 5;

function readHref(chapter: number, page?: number) {
  return page && page > 1 ? `/read?chapter=ch-${chapter}&page=${page}` : `/read?chapter=ch-${chapter}`;
}

function HeroIconButton({
  icon,
  label,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-sm active:opacity-70"
      style={{ backgroundColor: 'rgba(23,20,15,0.55)' }}
    >
      <Ionicons name={icon} size={20} color={colors.paper.DEFAULT} />
    </Pressable>
  );
}

function LinkRow({
  icon,
  title,
  detail,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  detail?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-[56px] flex-row items-center border-b border-line px-5 py-3 active:bg-paper-deep"
    >
      <Ionicons name={icon} size={20} color={colors.ink.DEFAULT} />
      <View className="ml-3 flex-1">
        <Text variant="label">{title}</Text>
        {detail ? (
          <Text variant="caption" tone="muted">
            {detail}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const [lastSeen, setLastSeen] = useState<number | null | undefined>(undefined);
  const [streak, setStreak] = useState(0);
  const { items } = useChapters();
  const { progress, read } = useReadingProgress();
  const { stateOf } = useDownloads();

  const first = items[0];
  const newestIndex = items[items.length - 1]?.index;
  const latest = [...items].slice(-3).reverse();
  const resumable = progress && items.some((c) => c.index === progress.chapter) ? progress : null;
  const resumePos = resumable ? items.findIndex((c) => c.index === resumable.chapter) : -1;
  const remaining = resumePos >= 0 ? items.length - resumePos - 1 : items.length;

  useFocusEffect(
    useCallback(() => {
      getLastSeenChapter().then(setLastSeen);
      getReadingDays().then((days) => setStreak(computeStreak(days)));
    }, [])
  );

  // Lần đầu mở app: coi như đã thấy mọi chương hiện có (không báo "mới" cho cả trăm chương)
  useEffect(() => {
    if (lastSeen === null && newestIndex) {
      setLastSeenChapter(newestIndex);
      setLastSeen(newestIndex);
    }
  }, [lastSeen, newestIndex]);

  const unseen = lastSeen ? items.filter((c) => c.index > lastSeen) : [];
  const realm = getRealm(read.size, items.length);

  // Các chương tiếp theo để tải offline: từ chương đang đọc (hoặc chương đầu)
  const startPos = Math.max(0, resumePos);
  const offlineTargets = items.slice(startPos, startPos + OFFLINE_BATCH).map((c) => c.index);
  const offlineStates = offlineTargets.map((n) => stateOf(n));
  const offlineDone = offlineStates.filter((s) => s?.status === 'done').length;
  const offlineBusy = offlineStates.some(
    (s) => s?.status === 'downloading' || s?.status === 'queued'
  );

  return (
    <View className="flex-1 bg-paper">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* Ảnh bìa tràn viền, mờ dần vào nền giấy */}
        <View style={{ height: height * 0.56, overflow: 'hidden' }}>
          <Image
            source={comic.cover}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%' }}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(23,20,15,0.35)', 'rgba(243,239,230,0)', colors.paper.DEFAULT]}
            locations={[0, 0.4, 1]}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
          />
          <View className="absolute right-4 flex-row gap-2" style={{ top: insets.top + 8 }}>
            <HeroIconButton
              icon="share-outline"
              label="Chia sẻ"
              onPress={() =>
                Share.share({ message: `${comic.title} — cùng Hàn Bá Thiên hành tẩu giang hồ!` })
              }
            />
            <HeroIconButton
              icon="settings-outline"
              label="Cài đặt"
              onPress={() => router.push('/settings')}
            />
          </View>
        </View>

        <View className="-mt-24 px-5">
          <Seal label={comic.status} />
          <Text variant="display" className="mt-3">
            {comic.title}
          </Text>
          <Text variant="body" tone="muted" className="mt-1">
            {comic.author}
          </Text>
          <Text variant="caption" tone="soft" className="mt-3">
            {[`${items.length} chương`, ...comic.genres].join('  ·  ')}
          </Text>

          {/* Báo chương mới kể từ lần trước */}
          {unseen.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              className="mt-5 flex-row items-center rounded-sm border border-seal px-4 py-3 active:bg-seal-soft"
              onPress={() => {
                setLastSeenChapter(newestIndex!);
                setLastSeen(newestIndex!);
                router.push(readHref(unseen[0].index));
              }}
            >
              <View className="h-2 w-2 rounded-full bg-seal" />
              <Text variant="label" tone="seal" className="ml-3 flex-1">
                {unseen.length === 1
                  ? `Chương ${unseen[0].index} vừa ra`
                  : `${unseen.length} chương mới từ lần trước`}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={colors.seal.DEFAULT} />
            </Pressable>
          ) : null}

          {/* CTA chính: đọc tiếp nếu có tiến độ */}
          <View className="mt-5 gap-2.5">
            {resumable ? (
              <Button
                label="Đọc tiếp"
                hint={`Chương ${resumable.chapter} · trang ${resumable.page}${
                  remaining > 0 ? ` · còn ${remaining} chương` : ''
                }`}
                icon="book"
                onPress={() => router.push(readHref(resumable.chapter, resumable.page))}
              />
            ) : (
              <Button
                label="Bắt đầu đọc"
                hint={first ? `Từ chương ${first.index} · ${items.length} chương` : undefined}
                icon="book"
                disabled={!first}
                onPress={() => first && router.push(readHref(first.index))}
              />
            )}
            <Button
              label="Danh sách chương"
              variant="secondary"
              icon="list"
              onPress={() => router.push('/chapters')}
            />
          </View>

          {/* Tải offline */}
          {offlineTargets.length ? (
            <Pressable
              accessibilityRole="button"
              disabled={offlineBusy || offlineDone === offlineTargets.length}
              className="mt-3 flex-row items-center self-start py-2 active:opacity-60"
              onPress={() => {
                haptic.light();
                downloadChapters(offlineTargets);
              }}
            >
              <Ionicons
                name={offlineDone === offlineTargets.length ? 'checkmark-circle' : 'arrow-down-circle-outline'}
                size={18}
                color={colors.muted}
              />
              <Text variant="body" tone="muted" className="ml-2">
                {offlineDone === offlineTargets.length
                  ? `Đã tải ${offlineTargets.length} chương tiếp để đọc offline`
                  : offlineBusy
                    ? `Đang tải… ${offlineDone}/${offlineTargets.length} chương`
                    : `Tải ${offlineTargets.length} chương tiếp để đọc offline`}
              </Text>
            </Pressable>
          ) : null}

          {/* Cảnh giới */}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/journey')}
            className="mt-8 rounded-sm bg-ink px-5 py-4 active:opacity-90"
          >
            <View className="flex-row items-center justify-between">
              <Text variant="overline" style={{ color: colors.night.muted }}>
                Cảnh giới
              </Text>
              <Text variant="caption" style={{ color: colors.night.muted }}>
                {streak > 0 ? `Chuỗi ${streak} ngày` : 'Đọc hôm nay để bắt đầu chuỗi'}
              </Text>
            </View>
            <View className="mt-1 flex-row items-end justify-between">
              <Text variant="title" tone="paper">
                {realm.current.name}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={colors.paper.DEFAULT} />
            </View>
            <View className="mt-3 h-1 overflow-hidden rounded-sm" style={{ backgroundColor: colors.night.line }}>
              <View className="h-1 bg-seal" style={{ width: `${Math.round(realm.progress * 100)}%` }} />
            </View>
            {realm.next ? (
              <Text variant="caption" className="mt-2" style={{ color: colors.night.muted }}>
                Còn {realm.next.remaining} chương để lên {realm.next.name}
              </Text>
            ) : null}
          </Pressable>

          {/* Cốt truyện */}
          <View className="mt-10">
            <Text variant="overline" tone="muted">
              Cốt truyện
            </Text>
            <Text variant="bodyLg" tone="soft" className="mt-2" numberOfLines={expanded ? undefined : 4}>
              {comic.description}
            </Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setExpanded(!expanded)}
              className="mt-2 self-start py-1"
            >
              <Text variant="label" tone="seal">
                {expanded ? 'Thu gọn' : 'Đọc thêm'}
              </Text>
            </Pressable>
          </View>

          {/* Chương mới */}
          <View className="mt-10 flex-row items-end justify-between">
            <Text variant="overline" tone="muted">
              Chương mới
            </Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              className="flex-row items-center py-1 active:opacity-60"
              onPress={() => router.push('/chapters')}
            >
              <Text variant="label" tone="seal">
                Xem tất cả
              </Text>
              <Ionicons name="arrow-forward" size={16} color={colors.seal.DEFAULT} />
            </Pressable>
          </View>
        </View>

        <View className="mt-2 border-t border-line">
          {latest.map((chapter) => (
            <ChapterRow
              key={chapter.id}
              chapter={chapter}
              isNew={chapter.index === newestIndex}
              read={read.has(chapter.index)}
              download={stateOf(chapter.index)}
              currentPage={resumable?.chapter === chapter.index ? resumable.page : undefined}
              onPress={() =>
                router.push(
                  readHref(
                    chapter.index,
                    resumable?.chapter === chapter.index ? resumable.page : undefined
                  )
                )
              }
            />
          ))}
        </View>

        {/* Lối tắt */}
        <View className="mt-8 border-t border-line">
          <LinkRow
            icon="bookmark-outline"
            title="Trang đã lưu"
            detail="Nhấn giữ một trang khi đọc để lưu lại"
            onPress={() => router.push('/saved')}
          />
          <LinkRow
            icon="trophy-outline"
            title="Hành trình"
            detail="Cảnh giới, chuỗi ngày đọc, thống kê"
            onPress={() => router.push('/journey')}
          />
        </View>
      </ScrollView>
    </View>
  );
}
