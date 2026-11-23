import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { colors } from '../../theme/tokens';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = {
  label: string;
  /** Dòng phụ dưới nhãn, vd "Chương 512 · trang 4" */
  hint?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  variant?: Variant;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
  trailing?: ReactNode;
};

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-seal active:bg-seal-deep',
  secondary: 'border border-ink active:bg-paper-deep',
  ghost: 'active:bg-paper-deep',
};

const FG: Record<Variant, string> = {
  primary: colors.paper.DEFAULT,
  secondary: colors.ink.DEFAULT,
  ghost: colors.ink.DEFAULT,
};

export function Button({
  label,
  hint,
  icon,
  variant = 'primary',
  onPress,
  disabled,
  className = '',
  trailing,
}: Props) {
  const fg = FG[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}, ${hint}` : label}
      onPress={onPress}
      disabled={disabled}
      className={`min-h-[52px] flex-row items-center rounded-sm px-5 ${CONTAINER[variant]} ${
        disabled ? 'opacity-40' : ''
      } ${className}`}
    >
      {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <View className={`flex-1 ${icon ? 'ml-3' : ''} ${hint ? 'py-2.5' : 'py-3.5'}`}>
        <Text variant="labelLg" style={{ color: fg }}>
          {label}
        </Text>
        {hint ? (
          <Text variant="caption" style={{ color: fg, opacity: 0.8 }}>
            {hint}
          </Text>
        ) : null}
      </View>
      {trailing ?? <Ionicons name="arrow-forward" size={18} color={fg} />}
    </Pressable>
  );
}
