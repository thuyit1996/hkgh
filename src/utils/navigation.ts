import { router } from 'expo-router';

/**
 * Quay lại màn trước; nếu không có (mở app bằng deep link / reload trực tiếp
 * vào màn con) thì về trang chủ thay vì ném lỗi GO_BACK.
 */
export function goBackOrHome() {
 if (router.canGoBack()) {
 router.back();
 return;
 }
 router.replace('/home');
}
