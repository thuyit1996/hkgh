import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { computeStreak, FINAL_REALM, getReadingDays, getRealm, REALMS } from '../api/stats';
import { Seal } from '../components/ui/Seal';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Text } from '../components/ui/Text';
import { useChapters } from '../hooks/useChapters';
import { useReadingProgress } from '../hooks/useReadingProgress';

function Stat({ value, label, first }: { value: string | number; label: string; first?: boolean }) {
  return (
    <View className={`flex-1 px-4 py-3 ${first ? '' : 'border-l border-line'}`}>
      <Text variant="title" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

/** Hành trình: cảnh giới theo số chương đã đọc + chuỗi ngày đọc */
export default function JourneyScreen() {
  const insets = useSafeAreaInsets();
  const { items } = useChapters();
  const { read } = useReadingProgress();
  const [days, setDays] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      getReadingDays().then(setDays);
    }, [])
  );

  const readCount = [...read].filter((n) => items.some((c) => c.index === n)).length;
  const pagesRead = items.filter((c) => read.has(c.index)).reduce((sum, c) => sum + c.pages, 0);
  const realm = getRealm(readCount, items.length);
  const streak = computeStreak(days);
  const ladder = [...REALMS.map((r) => ({ ...r })), { min: items.length, ...FINAL_REALM }];

  return (
    <View className="flex-1 bg-paper" style={{ paddingTop: insets.top }}>
      <ScreenHeader title="Hành trình" />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View className="items-center px-6 pb-8 pt-10">
          <Seal label="Cảnh giới" />
          <Text variant="display" className="mt-4 text-center">
            {realm.current.name}
          </Text>
          <Text variant="bodyLg" tone="soft" className="mt-2 text-center">
            {realm.current.blurb}
          </Text>

          <View className="mt-6 h-1.5 w-full overflow-hidden rounded-sm bg-line">
            <View className="h-1.5 bg-seal" style={{ width: `${Math.round(realm.progress * 100)}%` }} />
          </View>
          <Text variant="caption" tone="muted" className="mt-2">
            {realm.next
              ? `Còn ${realm.next.remaining} chương để lên ${realm.next.name}`
              : 'Đã đạt cảnh giới cao nhất'}
          </Text>
        </View>

        <View className="flex-row border-y border-line">
          <Stat first value={readCount} label="Chương đã đọc" />
          <Stat value={streak} label="Ngày liên tiếp" />
          <Stat value={days.length} label="Ngày đã đọc" />
        </View>
        <View className="flex-row border-b border-line">
          <Stat first value={pagesRead.toLocaleString('vi-VN')} label="Trang đã xem" />
          <Stat value={`${items.length ? Math.round((readCount / items.length) * 100) : 0}%`} label="Hoàn thành" />
        </View>

        <Text variant="overline" tone="muted" className="mt-10 px-5 pb-2">
          Các cảnh giới
        </Text>
        <View className="border-t border-line">
          {ladder.map((step) => {
            const reached = readCount >= step.min;
            const isCurrent = step.name === realm.current.name;
            return (
              <View
                key={step.name}
                className={`min-h-[56px] flex-row items-center border-b border-line px-5 py-3 ${
                  isCurrent ? 'bg-paper-deep' : ''
                }`}
              >
                <View
                  className={`h-2.5 w-2.5 rounded-full ${reached ? 'bg-seal' : 'border border-faint'}`}
                />
                <View className="ml-4 flex-1">
                  <Text variant="label" tone={reached ? 'ink' : 'muted'}>
                    {step.name}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {step.blurb}
                  </Text>
                </View>
                <Text variant="caption" tone="muted">
                  {step.min} chương
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
