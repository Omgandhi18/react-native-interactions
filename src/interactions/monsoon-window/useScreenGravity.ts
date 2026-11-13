import { SensorType, useAnimatedSensor, useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { GRAVITY } from './constants';
import type { Point } from './simulation';

/** Used until the sensor reports, or on devices without one: rain falls straight down. */
const STRAIGHT_DOWN: Point = { x: 0, y: 1 };

/**
 * Which way gravity pulls across the screen, in g (straight down is { x: 0, y: 1 }).
 * Reanimated reports gravity in device axes (x right, y up) pointing toward the ground on both
 * iOS and Android, so screen y is just the device y flipped.
 */
export function useScreenGravity(): SharedValue<Point> {
  const { sensor } = useAnimatedSensor(SensorType.GRAVITY);

  return useDerivedValue(() => {
    const { x, y, z } = sensor.get();
    if (x === 0 && y === 0 && z === 0) {
      return STRAIGHT_DOWN;
    }
    return { x: x / GRAVITY.standard, y: -y / GRAVITY.standard };
  });
}
