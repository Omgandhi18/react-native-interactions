import { useAnimatedReaction, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { LIGHT } from './constants';
import { playGlint } from './haptics';

/**
 * Ticks when the shader's bright band crosses the middle of the card, so you can feel the light.
 * The band's position uses the same `bandShift` the shader does.
 */
export function useGlintHaptics(tiltX: SharedValue<number>, tiltY: SharedValue<number>) {
  const lastTickAt = useSharedValue(0);

  useAnimatedReaction(
    () => Math.sign(tiltX.get() * LIGHT.bandShift[0] + tiltY.get() * LIGHT.bandShift[1]),
    (side, previousSide) => {
      if (previousSide === null || side === 0 || side === previousSide) {
        return;
      }
      const now = Date.now();
      if (now - lastTickAt.get() < LIGHT.glintTickMinGapMs) {
        return;
      }
      lastTickAt.set(now);
      scheduleOnRN(playGlint);
    },
  );
}
