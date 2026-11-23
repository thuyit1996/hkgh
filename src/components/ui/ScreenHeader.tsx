import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { colors } from '../../theme/tokens';
import { goBackOrHome } from '../../utils/navigation';
import { Text } from './Text';

type Props = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

/** Thanh tiêu đề chung cho các màn con: nút quay lại + tiêu đề serif + vùng phải */
export function ScreenHeader({ title, subtitle, right }: Props) {
  return (
    <View className="flex-row items-center border-b border-line px-2 pb-3 pt-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        hitSlop={8}
        className="h-11 w-11 items-center justify-center rounded-sm active:bg-paper-deep"
        onPress={goBackOrHome}
      >
        <Ionicons name="arrow-back" size={22} color={colors.ink.DEFAULT} />
      </Pressable>
      <View className="ml-1 flex-1">
        <Text variant="title" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View className="mr-2">{right}</View> : null}
    </View>
  );
}
