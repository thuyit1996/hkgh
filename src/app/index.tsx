import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hasOnboarded, setOnboarded } from '../api/prefs';
import { Button } from '../components/ui/Button';
import { Seal } from '../components/ui/Seal';
import { Text } from '../components/ui/Text';
import { comic, onboardingImage } from '../data/mock';
import { colors } from '../theme/tokens';

/** Màn chào — chỉ hiện ở lần mở app đầu tiên */
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    hasOnboarded().then((done) => {
      if (done) router.replace('/home');
      else setChecking(false);
    });
  }, []);

  const enter = () => {
    setOnboarded();
    router.replace('/home');
  };

  if (checking) return <View className="flex-1 bg-paper" />;

  return (
    <View className="flex-1 bg-paper">
      <View style={{ height: height * 0.6 }}>
        <Image source={onboardingImage} className="h-full w-full" resizeMode="cover" />
        <LinearGradient
          colors={['rgba(243,239,230,0)', colors.paper.DEFAULT]}
          locations={[0.55, 1]}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />
      </View>

      <View
        className="flex-1 justify-between px-6"
        style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
      >
        <View className="-mt-10">
          <Seal label="Võ hiệp" />
          <Text variant="display" className="mt-4">
            {comic.title}
          </Text>
          <Text variant="bodyLg" tone="soft" className="mt-3">
            Theo chân Hàn Bá Thiên bước vào chốn giang hồ đầy ân oán, nơi Chính – Tà phân tranh
            và võ lâm dậy sóng.
          </Text>
        </View>

        <Button label="Bước vào giang hồ" onPress={enter} />
      </View>
    </View>
  );
}
