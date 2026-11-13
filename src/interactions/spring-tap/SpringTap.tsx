import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, radii } from '@/theme';

const BALL_SIZE = 120;
const RESTING_SCALE = 1;
const PRESSED_SCALE = 0.85;
const SPRING_CONFIG = { damping: 12, stiffness: 220 } as const;

function playTapHaptic() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/**
 * Starter example showing the pattern every interaction uses:
 * a gesture hook drives a shared value on the UI thread, a spring animates it,
 * and anything JS-only (like haptics) is scheduled back onto the React Native thread.
 */
export function SpringTap() {
  const scale = useSharedValue(RESTING_SCALE);

  const tap = useTapGesture({
    onBegin: () => {
      'worklet';
      scale.set(withSpring(PRESSED_SCALE, SPRING_CONFIG));
    },
    onActivate: () => {
      'worklet';
      scheduleOnRN(playTapHaptic);
    },
    onFinalize: () => {
      'worklet';
      scale.set(withSpring(RESTING_SCALE, SPRING_CONFIG));
    },
  });

  const ballStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return (
    <View style={styles.container}>
      <GestureDetector gesture={tap}>
        <Animated.View style={[styles.ball, ballStyle]} />
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  ball: {
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
  },
});
