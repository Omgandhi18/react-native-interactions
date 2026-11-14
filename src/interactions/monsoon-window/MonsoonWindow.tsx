import { StyleSheet, View } from 'react-native';

import { useMeasuredSize } from '@/shared/useMeasuredSize';
import { colors } from '@/theme';

import { MonsoonScene } from './MonsoonScene';

/**
 * A foggy window on a monsoon night. Wipe the fog with your finger, watch drops run down the
 * glass (tilt the phone to steer them), and double-tap for lightning.
 *
 * This component only measures the space it has, then hands it to the scene.
 */
export function MonsoonWindow() {
  const { size, onLayout } = useMeasuredSize();

  return (
    <View style={styles.container} onLayout={onLayout}>
      {size && <MonsoonScene width={size.width} height={size.height} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
