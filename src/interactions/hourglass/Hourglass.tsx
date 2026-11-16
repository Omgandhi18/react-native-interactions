import { StyleSheet, View } from 'react-native';

import { FadingHint } from '@/components/FadingHint';
import { useMeasuredSize } from '@/shared/useMeasuredSize';
import { colors } from '@/theme';

import { HINT } from './constants';
import { HourglassScene } from './HourglassScene';

/** A 30-second hourglass of 7,200 grains that pours at a steady rate. Tap, or turn the phone over, to flip it. */
export function Hourglass() {
  const { size, onLayout } = useMeasuredSize();

  return (
    <View style={styles.container} onLayout={onLayout}>
      {size && <HourglassScene width={size.width} height={size.height} />}
      <FadingHint hint={HINT} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
