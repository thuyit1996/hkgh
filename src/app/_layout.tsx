import '../../global.css';

import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
} from '@expo-google-fonts/be-vietnam-pro';
import {
  NotoSerifDisplay_600SemiBold,
  NotoSerifDisplay_700Bold,
} from '@expo-google-fonts/noto-serif-display';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '../theme/tokens';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
    NotoSerifDisplay_600SemiBold,
    NotoSerifDisplay_700Bold,
  });

  // Font nằm sẵn trong bundle nên tải gần như tức thì; lỗi thì vẫn cho chạy bằng font hệ thống
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colors.paper.DEFAULT }} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper.DEFAULT },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="home" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="read"
          options={{ animation: 'fade', contentStyle: { backgroundColor: colors.night.DEFAULT } }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
