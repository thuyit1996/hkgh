import { Text as RNText, type TextProps } from 'react-native';

const VARIANTS = {
  /** Tên truyện, tiêu đề lớn */
  display: 'font-serif-b text-3xl',
  /** Tiêu đề màn */
  title: 'font-serif-b text-xl',
  /** Tiêu đề section */
  heading: 'font-serif text-lg',
  /** Số chương lớn */
  numeral: 'font-serif-b text-xl',
  bodyLg: 'font-body text-base',
  body: 'font-body text-sm',
  label: 'font-body-sb text-sm',
  labelLg: 'font-body-sb text-base',
  caption: 'font-body text-xs',
  /** Nhãn nhỏ viết hoa, giãn chữ */
  overline: 'font-body-sb text-xs uppercase tracking-widest',
} as const;

const TONES = {
  ink: 'text-ink',
  soft: 'text-ink-soft',
  muted: 'text-muted',
  faint: 'text-faint',
  seal: 'text-seal',
  paper: 'text-paper',
} as const;

export type TextVariant = keyof typeof VARIANTS;
export type TextTone = keyof typeof TONES;

type Props = TextProps & {
  variant?: TextVariant;
  /** Màu theo token. Màu động (vd theme reader) truyền qua `style={{ color }}`. */
  tone?: TextTone;
  className?: string;
};

/** Mọi chữ trong app đi qua component này để giữ đúng font + thang chữ */
export function Text({ variant = 'body', tone = 'ink', className = '', ...rest }: Props) {
  return <RNText className={`${VARIANTS[variant]} ${TONES[tone]} ${className}`} {...rest} />;
}
