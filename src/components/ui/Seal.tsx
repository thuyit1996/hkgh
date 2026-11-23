import { View } from 'react-native';

import { Text } from './Text';

type Props = {
  label: string;
  /** solid: nền đỏ chữ giấy. outline: viền đỏ chữ đỏ (nhẹ hơn, dùng trong danh sách). */
  tone?: 'solid' | 'outline';
};

/** Nhãn kiểu con dấu triện đỏ son — chi tiết nhận diện của app */
export function Seal({ label, tone = 'solid' }: Props) {
  const solid = tone === 'solid';
  return (
    <View
      className={`self-start rounded-sm border border-seal px-1.5 py-0.5 ${solid ? 'bg-seal' : ''}`}
      style={solid ? { transform: [{ rotate: '-2deg' }] } : undefined}
    >
      <Text variant="overline" tone={solid ? 'paper' : 'seal'}>
        {label}
      </Text>
    </View>
  );
}
