const { colors, fonts } = require('./src/theme/tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    // Thang chữ cố định — không dùng text-[Npx]. Nhỏ nhất 12.
    fontSize: {
      xs: ['12px', { lineHeight: '16px' }],
      sm: ['14px', { lineHeight: '20px' }],
      base: ['16px', { lineHeight: '24px' }],
      lg: ['20px', { lineHeight: '26px' }],
      xl: ['24px', { lineHeight: '30px' }],
      '2xl': ['30px', { lineHeight: '36px' }],
      '3xl': ['38px', { lineHeight: '44px' }],
    },
    // Font custom: mỗi weight là một family riêng. KHÔNG dùng font-bold/font-semibold
    // (fontWeight làm iOS/Android rơi về font hệ thống).
    fontFamily: {
      serif: [fonts.serif],
      'serif-b': [fonts.serifBold],
      body: [fonts.body],
      'body-md': [fonts.bodyMedium],
      'body-sb': [fonts.bodySemi],
      'body-b': [fonts.bodyBold],
    },
    extend: {
      colors,
      borderRadius: {
        sm: '3px',
        DEFAULT: '6px',
      },
    },
  },
  plugins: [],
};
