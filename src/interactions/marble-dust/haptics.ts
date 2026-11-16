import * as Haptics from 'expo-haptics';

/** A heavy thump as the statue bursts apart. */
export function playBlast() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

/** A faint tick, like grit under a fingertip, while a swipe knocks grains loose. */
export function playScatterTick() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
}
