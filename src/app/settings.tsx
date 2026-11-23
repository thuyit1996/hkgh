import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState, type ComponentProps } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDownloadedChapters, getDownloadedSize, removeAllChapters } from '../api/offline';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Text } from '../components/ui/Text';
import { comic } from '../data/mock';
import { R2_BASE_URL } from '../data/r2';
import { useDownloads } from '../hooks/useDownloads';
import { colors } from '../theme/tokens';

type Row = { icon: ComponentProps<typeof Ionicons>['name']; label: string; value: string };

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function InfoRow({ row, first }: { row: Row; first?: boolean }) {
  return (
    <View className={`min-h-[56px] flex-row items-center px-5 ${first ? '' : 'border-t border-line'}`}>
      <Ionicons name={row.icon} size={20} color={colors.muted} />
      <Text variant="body" className="ml-3">
        {row.label}
      </Text>
      <Text variant="body" tone="muted" numberOfLines={1} className="ml-4 flex-1 text-right">
        {row.value}
      </Text>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { version } = useDownloads();
  const [offline, setOffline] = useState({ count: 0, size: 0 });

  const refresh = useCallback(() => {
    setOffline({ count: getDownloadedChapters().length, size: getDownloadedSize() });
    // phụ thuộc `version` để tính lại khi có chương tải xong / bị xoá
  }, [version]);
  useFocusEffect(refresh);

  const info: Row[] = [
    { icon: 'book-outline', label: 'Truyện', value: comic.title },
    { icon: 'person-outline', label: 'Tác giả', value: comic.author },
    { icon: 'cloud-outline', label: 'Nguồn ảnh', value: R2_BASE_URL.replace('https://', '') },
    { icon: 'information-circle-outline', label: 'Phiên bản', value: '1.0.0' },
  ];

  const confirmClear = () => {
    Alert.alert('Xoá chương đã tải?', `Giải phóng ${formatSize(offline.size)} trên máy.`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: () => {
          removeAllChapters();
          refresh();
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-paper" style={{ paddingTop: insets.top }}>
      <ScreenHeader title="Cài đặt" />

      <ScrollView contentContainerStyle={{ paddingTop: 24, paddingBottom: insets.bottom + 24 }}>
        <Text variant="overline" tone="muted" className="px-5 pb-2">
          Đọc offline
        </Text>
        <View className="border-y border-line">
          <InfoRow
            first
            row={{
              icon: 'arrow-down-circle-outline',
              label: 'Đã tải',
              value: offline.count ? `${offline.count} chương · ${formatSize(offline.size)}` : 'Chưa có',
            }}
          />
          {offline.count ? (
            <Pressable
              accessibilityRole="button"
              onPress={confirmClear}
              className="min-h-[56px] flex-row items-center border-t border-line px-5 active:bg-paper-deep"
            >
              <Ionicons name="trash-outline" size={20} color={colors.seal.DEFAULT} />
              <Text variant="body" tone="seal" className="ml-3">
                Xoá tất cả chương đã tải
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Text variant="caption" tone="muted" className="mt-2 px-5">
          Nhấn giữ một chương trong danh sách để tải về hoặc xoá.
        </Text>

        <Text variant="overline" tone="muted" className="mt-8 px-5 pb-2">
          Thông tin
        </Text>
        <View className="border-y border-line">
          {info.map((row, index) => (
            <InfoRow key={row.label} row={row} first={index === 0} />
          ))}
        </View>

        <Text variant="caption" tone="muted" className="mt-4 px-5">
          Ứng dụng đọc riêng cho bộ truyện {comic.title}. Ảnh chương tải trực tiếp từ Cloudflare
          R2.
        </Text>
      </ScrollView>
    </View>
  );
}
