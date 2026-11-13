import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { colors } from '@/theme';

import { MonsoonScene } from './MonsoonScene';

type Size = { width: number; height: number };

/**
 * A foggy window on a monsoon night. Wipe the fog with your finger, watch drops run down the
 * glass (tilt the phone to steer them), and double-tap for lightning.
 *
 * This component only measures the space it has (the real view size, which on Android can be
 * taller than the window dimensions), then hands it to the scene.
 */
export function MonsoonWindow() {
  const [size, setSize] = useState<Size | null>(null);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) =>
      current?.width === width && current.height === height ? current : { width, height },
    );
  };

  return (
    <View style={styles.container} onLayout={handleLayout}>
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
