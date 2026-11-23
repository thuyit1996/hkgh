/**
 * Design tokens dùng chung cho tailwind.config.js và code TS (màu icon, style động).
 * Bảng màu "Mực & Giấy": lấy từ chính tranh truyện trắng đen, một màu nhấn đỏ son (con dấu triện).
 */
const colors = {
  paper: {
    DEFAULT: '#F3EFE6', // nền chính
    deep: '#E8E2D5', // ô nhập, khối nổi
  },
  ink: {
    DEFAULT: '#17140F', // chữ chính
    soft: '#3A342B',
  },
  muted: '#6F675B', // chữ phụ (tương phản ~5:1 trên paper)
  faint: '#A39B8E', // chỉ dùng cho icon phụ / trạng thái tắt
  line: '#D9D1C2', // đường kẻ
  seal: {
    DEFAULT: '#B3302A', // đỏ son: CTA chính, con dấu, tiến độ
    deep: '#8E241F',
    soft: '#F0DDD6',
  },
  night: {
    DEFAULT: '#0E0D0B',
    raised: '#1A1815',
    line: '#2A2722',
    text: '#E9E4DA',
    muted: '#8C857A',
  },
  sepia: {
    DEFAULT: '#E9DFC9',
    raised: '#DDD1B6',
    line: '#CBBE9F',
  },
};

const fonts = {
  serif: 'NotoSerifDisplay_600SemiBold',
  serifBold: 'NotoSerifDisplay_700Bold',
  body: 'BeVietnamPro_400Regular',
  bodyMedium: 'BeVietnamPro_500Medium',
  bodySemi: 'BeVietnamPro_600SemiBold',
  bodyBold: 'BeVietnamPro_700Bold',
};

module.exports = { colors, fonts };
