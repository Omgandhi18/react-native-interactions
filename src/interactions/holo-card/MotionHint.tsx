import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontSizes } from '@/theme';

import { HINT } from './constants';

/** A short "how to play" line at the bottom that fades away after a few seconds. */
export function MotionHint() {
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.set(withDelay(HINT.visibleMs, withTiming(0, { duration: HINT.fadeMs })));
  }, [opacity]);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <View pointerEvents="none" style={[styles.container, { bottom: insets.bottom + HINT.bottomOffset }]}>
      <Animated.Text style={[styles.text, fade]}>{HINT.text}</Animated.Text>
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
