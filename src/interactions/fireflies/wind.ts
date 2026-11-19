// The wind that moves the grass and carries the fireflies: waves roll across the screen, and
// gusts come and go on two slow cycles that rarely line up.
import { WIND } from './constants';

const HALF = 0.5;
const WAVE_NUMBER = (2 * Math.PI) / WIND.wavelength;
const WAVE_FREQUENCY = WAVE_NUMBER * WIND.waveSpeed;

/** The wind at screen x and `time` seconds, from -1 to 1. Positive leans things to the right. */
export function windAt(x: number, time: number): number {
  'worklet';
  const gustA = HALF + HALF * Math.sin(time * WIND.gustSpeedA);
  const gustB = HALF + HALF * Math.sin(time * WIND.gustSpeedB + WIND.gustOffset);
  const gust = WIND.calm + (1 - WIND.calm) * gustA * gustB;
  const wave =
    (1 - WIND.detailShare) * Math.sin(x * WAVE_NUMBER - time * WAVE_FREQUENCY) +
    WIND.detailShare * Math.sin(x * WAVE_NUMBER * WIND.detailScale - time * WAVE_FREQUENCY * WIND.detailSpeed + WIND.detailOffset);
  return gust * (WIND.steady + WIND.ripple * wave);
}
