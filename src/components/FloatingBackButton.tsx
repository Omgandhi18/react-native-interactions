import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings } from '@/strings';
import { colors, radii, spacing } from '@/theme';

const BUTTON_SIZE = 40;
const CHEVRON_SIZE = 11;
const CHEVRON_STROKE = 2;
const CHEVRON_NUDGE_RIGHT = 3;
const RESTING_OPACITY = 0.55;
const PRESSED_OPACITY = 0.9;

/** Small, quiet back button for full-screen interactions, so it barely shows in recordings. */
export function FloatingBackButton() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.backLabel}
      onPress={() => router.back()}
      hitSlop={spacing.sm}
      style={({ pressed }) => [
        styles.button,
        { top: insets.top + spacing.sm, opacity: pressed ? PRESSED_OPACITY : RESTING_OPACITY },
      ]}
    >
      <View style={styles.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: spacing.md,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
  chevron: {
    width: CHEVRON_SIZE,
    height: CHEVRON_SIZE,
    marginLeft: CHEVRON_NUDGE_RIGHT,
    borderLeftWidth: CHEVRON_STROKE,
    borderBottomWidth: CHEVRON_STROKE,
    borderColor: colors.textPrimary,
    transform: [{ rotate: '45deg' }],
  },
});
