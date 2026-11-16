import { SensorType, useAnimatedSensor, useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

/** The sensor reports in m/s²; this is 1 g. */
const STANDARD_GRAVITY = 9.81;

export type ScreenVector = { x: number; y: number };

/** Used until the sensor reports, or on devices without one (like the iOS Simulator): straight down. */
const STRAIGHT_DOWN: ScreenVector = { x: 0, y: 1 };

/**
 * Which way gravity pulls across the screen, in g (straight down is { x: 0, y: 1 }).
 * Reanimated reports gravity in device axes (x right, y up) pointing toward the ground on both
 * iOS and Android, so screen y is just the device y flipped.
 */
export function useScreenGravity(): SharedValue<ScreenVector> {
  const { sensor } = useAnimatedSensor(SensorType.GRAVITY);

  return useDerivedValue(() => {
    const { x, y, z } = sensor.get();
    if (x === 0 && y === 0 && z === 0) {
      return STRAIGHT_DOWN;
    }
    return { x: x / STANDARD_GRAVITY, y: -y / STANDARD_GRAVITY };
  });
}
