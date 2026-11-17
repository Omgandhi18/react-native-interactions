import { StyleSheet, View } from 'react-native';

import { FadingHint } from '@/components/FadingHint';
import { useMeasuredSize } from '@/shared/useMeasuredSize';
import { colors } from '@/theme';

import { HINT } from './constants';
import { MurmurationScene } from './MurmurationScene';

/** Thousands of starlings over a dusk sky. Your finger is a falcon they split around. */
export function Murmuration() {
  const { size, onLayout } = useMeasuredSize();

  return (
    <View style={styles.container} onLayout={onLayout}>
      {size && <MurmurationScene width={size.width} height={size.height} />}
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
