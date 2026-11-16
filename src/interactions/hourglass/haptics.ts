import * as Haptics from 'expo-haptics';

/** A tick as you pick the glass up to flip it. */
export function playLift() {
  void Haptics.selectionAsync();
}

/** A knock as it's set back down. */
export function playLand() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
}

/** The last grain has fallen: time's up. */
export function playRunOut() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
