import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, FlatList, Platform, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { downloadChapters, removeChapter } from '../api/offline';
import { ChapterRow } from '../components/ChapterRow';
import { Skeleton } from '../components/Skeleton';
import { Button } from '../components/ui/Button';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Text } from '../components/ui/Text';
import { comic } from '../data/mock';
import { type ChapterItem, useChapters } from '../hooks/useChapters';
import { useDownloads } from '../hooks/useDownloads';
import { useReadingProgress } from '../hooks/useReadingProgress';
import { haptic } from '../native/haptics';
import { colors, fonts } from '../theme/tokens';

export default function ChapterListScreen() {
  const insets = useSafeAreaInsets();
  const [newestFirst, setNewestFirst] = useState(true);
  const [query, setQuery] = useState('');
  const { items, loading, error, reload } = useChapters();
  const { progress, read } = useReadingProgress();
  const { stateOf, version } = useDownloads();
  const newestIndex = items[items.length - 1]?.index;

  const list = useMemo(() => {
    const base = newestFirst ? [...items].reverse() : items;
    const keyword = query.trim();
    if (!keyword) return base;
    return base.filter((chapter) => String(chapter.index).includes(keyword));
  }, [items, newestFirst, query]);

  const open = (index: number) => {
    const page = progress?.chapter === index ? progress.page : undefined;
    router.push(
      page && page > 1 ? `/read?chapter=ch-${index}&page=${page}` : `/read?chapter=ch-${index}`
    );
  };

  /** Nhấn giữ một chương: tải về / xoá bản offline */
  const showActions = (chapter: ChapterItem) => {
    haptic.light();
    const downloaded = stateOf(chapter.index)?.status === 'done';
    const action = downloaded ? 'Xoá bản đã tải' : 'Tải về để đọc offline';
    const run = () => {
      if (downloaded) removeChapter(chapter.index);
      else downloadChapters([chapter.index]);
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: `Chương ${chapter.index}`,
          options: [action, 'Huỷ'],
          cancelButtonIndex: 1,
          destructiveButtonIndex: downloaded ? 0 : undefined,
        },
        (index) => index === 0 && run()
      );
    } else {
      Alert.alert(`Chương ${chapter.index}`, undefined, [
        { text: 'Huỷ', style: 'cancel' },
        { text: action, onPress: run },
      ]);
    }
  };

  return (
    <View className="flex-1 bg-paper" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title="Danh sách chương"
        subtitle={`${comic.title}${loading ? '' : ` · ${items.length} chương`}`}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={newestFirst ? 'Đang xếp mới nhất trước' : 'Đang xếp cũ nhất trước'}
            hitSlop={6}
            className="h-11 flex-row items-center rounded-sm px-2 active:bg-paper-deep"
            onPress={() => setNewestFirst(!newestFirst)}
          >
            <Ionicons name="swap-vertical" size={16} color={colors.ink.DEFAULT} />
            <Text variant="label" className="ml-1">
              {newestFirst ? 'Mới nhất' : 'Cũ nhất'}
            </Text>
          </Pressable>
        }
      />

      <View className="px-4 py-3">
        <View className="h-12 flex-row items-center rounded-sm bg-paper-deep px-3">
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Nhảy tới chương số…"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            returnKeyType="go"
            onSubmitEditing={() => list[0] && open(list[0].index)}
            className="ml-2 flex-1 text-base text-ink"
            style={{ fontFamily: fonts.body }}
          />
          {query ? (
            <Pressable accessibilityLabel="Xoá" hitSlop={10} onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View className="border-t border-line">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <View key={row} className="h-[68px] justify-center border-b border-line px-5">
              <Skeleton height={14} width="45%" radius={2} />
            </View>
          ))}
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="cloud-offline-outline" size={36} color={colors.muted} />
          <Text variant="body" tone="muted" className="mt-3 text-center">
            {error}
          </Text>
          <Button label="Thử lại" className="mt-5 self-stretch" onPress={() => reload()} />
        </View>
      ) : (
        <FlatList
          data={list}
          extraData={version}
          keyExtractor={(chapter) => chapter.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          className="border-t border-line"
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          ListHeaderComponent={
            <Text variant="caption" tone="muted" className="px-5 py-2">
              Nhấn giữ một chương để tải về đọc offline.
            </Text>
          }
          ListEmptyComponent={
            <View className="items-center px-8 py-12">
              <Text variant="body" tone="muted" className="text-center">
                Không có chương {query}.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ChapterRow
              chapter={item}
              isNew={item.index === newestIndex}
              read={read.has(item.index)}
              currentPage={progress?.chapter === item.index ? progress.page : undefined}
              download={stateOf(item.index)}
              onPress={() => open(item.index)}
              onLongPress={() => showActions(item)}
            />
          )}
        />
      )}
    </View>
  );
}
