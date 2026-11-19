import { StyleSheet, View } from 'react-native';

import { FadingHint } from '@/components/FadingHint';
import { useMeasuredSize } from '@/shared/useMeasuredSize';
import { colors } from '@/theme';

import { HINT } from './constants';
import { FirefliesScene } from './FirefliesScene';

/** A jar of sleeping fireflies. Wake them and they blink at random, then fall into sync. */
export function Fireflies() {
  const { size, onLayout } = useMeasuredSize();

  return (
    <View style={styles.container} onLayout={onLayout}>
      {size && <FirefliesScene width={size.width} height={size.height} />}
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
