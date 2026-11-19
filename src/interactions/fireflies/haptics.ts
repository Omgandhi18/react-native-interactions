import * as Haptics from 'expo-haptics';

/** A tap on the glass as you wake them. */
export function playWake() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** You startled them. */
export function playStartle() {
  void Haptics.selectionAsync();
}

/** The whole meadow flashing together. */
export function playPulse() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
}
