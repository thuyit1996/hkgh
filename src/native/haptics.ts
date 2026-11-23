import * as Haptics from 'expo-haptics';

/**
 * Rung nhẹ phản hồi thao tác. expo-haptics dùng requireOptionalNativeModule nên
 * trên bản build cũ (chưa có module native) các hàm chỉ reject → nuốt lỗi.
 */
export const haptic = {
  tap() {
    Haptics.selectionAsync().catch(() => undefined);
  },
  light() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  },
  success() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  },
};
