import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Image, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getSavedPages, removeSavedPage, type SavedPage } from '../api/saved';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Text } from '../components/ui/Text';
import { haptic } from '../native/haptics';
import { ExpoImage } from '../native/image';
import { sharePage } from '../native/share';
import { colors } from '../theme/tokens';

const GAP = 12;
const PAD = 20;

/** Các trang truyện đã lưu, dạng lưới 2 cột */
export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [pages, setPages] = useState<SavedPage[] | null>(null);

  const reload = useCallback(() => {
    getSavedPages().then(setPages);
  }, []);
  useFocusEffect(reload);

  const tileWidth = (width - PAD * 2 - GAP) / 2;
  const tileHeight = tileWidth * 1.445;

  const showActions = (item: SavedPage) => {
    haptic.light();
    Alert.alert(`Chương ${item.chapter} · trang ${item.page}`, undefined, [
      { text: 'Chia sẻ ảnh', onPress: () => sharePage(item.url, item.chapter, item.page).catch(() => undefined) },
      {
        text: 'Bỏ lưu',
        style: 'destructive',
        onPress: () => removeSavedPage(item.chapter, item.page).then(reload),
      },
      { text: 'Huỷ', style: 'cancel' },
    ]);
  };

  return (
    <View className="flex-1 bg-paper" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title="Trang đã lưu"
        subtitle={pages?.length ? `${pages.length} trang` : undefined}
      />

      {pages && pages.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="bookmark-outline" size={36} color={colors.muted} />
          <Text variant="heading" className="mt-4 text-center">
            Chưa lưu trang nào
          </Text>
          <Text variant="body" tone="muted" className="mt-2 text-center">
            Khi đọc, nhấn giữ một trang truyện để lưu lại khung tranh bạn thích.
          </Text>
        </View>
      ) : (
        <FlatList
          data={pages ?? []}
          numColumns={2}
          keyExtractor={(p) => `${p.chapter}-${p.page}`}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{
            padding: PAD,
            gap: GAP + 8,
            paddingBottom: insets.bottom + 24,
          }}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Chương ${item.chapter}, trang ${item.page}`}
              style={{ width: tileWidth }}
              className="active:opacity-80"
              onPress={() => router.push(`/read?chapter=ch-${item.chapter}&page=${item.page}`)}
              onLongPress={() => showActions(item)}
            >
              <View
                className="overflow-hidden rounded-sm border border-line bg-paper-deep"
                style={{ height: tileHeight }}
              >
                {ExpoImage ? (
                  <ExpoImage
                    source={{ uri: item.url }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    cachePolicy="disk"
                    transition={150}
                  />
                ) : (
                  <Image source={{ uri: item.url }} className="h-full w-full" resizeMode="cover" />
                )}
              </View>
              <Text variant="label" className="mt-2">
                Chương {item.chapter}
              </Text>
              <Text variant="caption" tone="muted">
                Trang {item.page}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
