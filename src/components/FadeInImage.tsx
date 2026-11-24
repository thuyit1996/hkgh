import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';

import { ExpoImage } from '../native/image';
import { Skeleton } from './Skeleton';
import { Text } from './ui/Text';

type Props = {
  uri: string;
  width: number;
  height: number;
  /** Màu nền + màu khối loading + màu chữ phụ, theo theme của reader */
  background: string;
  placeholder: string;
  muted: string;
  /** Nhấn giữ trang (lưu / chia sẻ) */
  onLongPress?: () => void;
  /** Kích thước thật của ảnh khi tải xong (để reader đặt đúng chiều cao trang) */
  onSize?: (width: number, height: number) => void;
};

/**
 * Ảnh trang truyện: skeleton đúng tỉ lệ → fade-in khi tải xong.
 * Lỗi tải thì hiện nút "Tải lại trang" thay vì để trống.
 */
export function FadeInImage({
  uri,
  width,
  height,
  background,
  placeholder,
  muted,
  onLongPress,
  onSize,
}: Props) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status !== 'loaded' || ExpoImage) return;
    Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [status, opacity]);

  // Thêm tham số để vượt cache khi thử lại (không áp dụng cho file trên máy)
  const source =
    attempt > 0 && !uri.startsWith('file://')
      ? `${uri}${uri.includes('?') ? '&' : '?'}r=${attempt}`
      : uri;

  const retry = () => {
    opacity.setValue(0);
    setStatus('loading');
    setAttempt((n) => n + 1);
  };

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={450}
      style={{ width, height, backgroundColor: background }}
    >
      {status === 'loading' ? (
        <Skeleton
          height={height}
          width={width}
          radius={0}
          color={placeholder}
          style={{ position: 'absolute' }}
        />
      ) : null}

      {status === 'error' ? (
        <View className="absolute inset-0 items-center justify-center">
          <Ionicons name="image-outline" size={32} color={muted} />
          <Text variant="body" className="mt-2" style={{ color: muted }}>
            Không tải được trang này
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={retry}
            className="mt-3 flex-row items-center rounded-sm border px-4 py-2.5 active:opacity-60"
            style={{ borderColor: muted }}
          >
            <Ionicons name="refresh" size={16} color={muted} />
            <Text variant="label" className="ml-1.5" style={{ color: muted }}>
              Tải lại trang
            </Text>
          </Pressable>
        </View>
      ) : ExpoImage ? (
        <ExpoImage
          key={source}
          source={{ uri: source }}
          style={{ position: 'absolute', width, height }}
          contentFit="contain"
          cachePolicy="disk"
          transition={200}
          recyclingKey={source}
          onLoad={(e) => {
            if (e.source?.width && e.source?.height) onSize?.(e.source.width, e.source.height);
            setStatus('loaded');
          }}
          onError={() => setStatus('error')}
        />
      ) : (
        <Animated.Image
          key={source}
          source={{ uri: source }}
          style={{ position: 'absolute', width, height, opacity }}
          resizeMode="contain"
          onLoad={(e) => {
            const src = e.nativeEvent?.source;
            if (src?.width && src?.height) onSize?.(src.width, src.height);
            setStatus('loaded');
          }}
          onError={() => setStatus('error')}
        />
      )}
    </Pressable>
  );
}
