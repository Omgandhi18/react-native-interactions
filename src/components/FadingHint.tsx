import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontSizes } from '@/theme';

export type Hint = {
  text: string;
  visibleMs: number;
  fadeMs: number;
  /** Distance above the bottom safe area, in dp. */
  bottomOffset: number;
};

type Props = {
  hint: Hint;
};

/** A short "how to play" line at the bottom that fades away after a few seconds. */
export function FadingHint({ hint }: Props) {
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.set(withDelay(hint.visibleMs, withTiming(0, { duration: hint.fadeMs })));
  }, [opacity, hint]);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <View pointerEvents="none" style={[styles.container, { bottom: insets.bottom + hint.bottomOffset }]}>
      <Animated.Text style={[styles.text, fade]}>{hint.text}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  text: {
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
  },
});
