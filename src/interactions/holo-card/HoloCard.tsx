import { StyleSheet, View } from 'react-native';

import { FadingHint } from '@/components/FadingHint';
import { useMeasuredSize } from '@/shared/useMeasuredSize';
import { colors } from '@/theme';

import { CardScene } from './CardScene';
import { HINT } from './constants';
import type { CardDesign } from './designs/types';

type Props = {
  design: CardDesign;
};

/**
 * A holographic card you can tilt, drag and flip. The engine is shared: each card is just a
 * design (artwork and foil masks for its front and back) handed to this component.
 */
export function HoloCard({ design }: Props) {
  const { size, onLayout } = useMeasuredSize();

  return (
    <View style={styles.container} onLayout={onLayout}>
      {size && <CardScene width={size.width} height={size.height} design={design} />}
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
