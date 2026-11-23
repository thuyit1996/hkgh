import type { ComponentType } from 'react';
import { Image as RNImage } from 'react-native';

/**
 * expo-image (cache trên đĩa, decode nhanh, transition mượt) nếu bản build có module native;
 * bản build cũ thì rơi về Image của React Native. Sau khi build lại app sẽ tự dùng expo-image.
 */

type ExpoImageModule = typeof import('expo-image');

let expo: ExpoImageModule | null = null;
try {
  expo = require('expo-image') as ExpoImageModule;
} catch {
  expo = null;
}

export const ExpoImage: ComponentType<import('expo-image').ImageProps> | null = expo?.Image ?? null;

/** Tải trước ảnh vào cache */
export function prefetchImages(urls: string[]) {
  if (!urls.length) return;
  if (expo) {
    expo.Image.prefetch(urls, 'disk').catch(() => undefined);
    return;
  }
  urls.forEach((url) => {
    RNImage.prefetch(url).catch(() => undefined);
  });
}
