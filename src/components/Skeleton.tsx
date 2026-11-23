import { useEffect, useRef } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../theme/tokens';

type Props = {
 height?: number;
 width?: number | `${number}%`;
 radius?: number;
 color?: string;
 style?: StyleProp<ViewStyle>;
};

/** Khối xám nhấp nháy dùng cho trạng thái loading */
export function Skeleton({ height = 16, width, radius = 8, color = colors.line, style }: Props) {
 const opacity = useRef(new Animated.Value(0.45)).current;

 useEffect(() => {
 const loop = Animated.loop(
 Animated.sequence([
 Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
 Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
 ])
 );
 loop.start();
 return () => loop.stop();
 }, [opacity]);

 return (
 <Animated.View
 style={[
 { height, width, borderRadius: radius, backgroundColor: color, opacity },
 style,
 ]}
 />
 );
}
