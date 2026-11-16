import { StyleSheet, View } from 'react-native';

import { FadingHint } from '@/components/FadingHint';
import { useMeasuredSize } from '@/shared/useMeasuredSize';
import { colors } from '@/theme';

import { HINT } from './constants';
import { DustScene } from './DustScene';

/** Michelangelo's David as thousands of marble grains you can scatter and shatter. */
export function MarbleDust() {
  const { size, onLayout } = useMeasuredSize();

  return (
    <View style={styles.container} onLayout={onLayout}>
      {size && <DustScene width={size.width} height={size.height} />}
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
