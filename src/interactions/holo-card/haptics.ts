import * as Haptics from 'expo-haptics';

export function playFlip() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/** A tiny tick as the bright band of light sweeps across the middle of the card. */
export function playGlint() {
  void Haptics.selectionAsync();
}
