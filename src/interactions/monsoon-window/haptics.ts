import * as Haptics from 'expo-haptics';

/** Thunder arrives a moment after the flash, rolls, then fades. */
const THUNDER_RUMBLE = [
  { delayMs: 450, style: Haptics.ImpactFeedbackStyle.Heavy },
  { delayMs: 600, style: Haptics.ImpactFeedbackStyle.Heavy },
  { delayMs: 820, style: Haptics.ImpactFeedbackStyle.Medium },
  { delayMs: 1080, style: Haptics.ImpactFeedbackStyle.Light },
] as const;

/** A light tick, like a finger squeaking across wet glass. */
export function playWipeTick() {
  void Haptics.selectionAsync();
}

export function playThunder() {
  THUNDER_RUMBLE.forEach(({ delayMs, style }) => {
    setTimeout(() => void Haptics.impactAsync(style), delayMs);
  });
}
