import { Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { FloatingBackButton } from '@/components/FloatingBackButton';
import { findInteraction } from '@/interactions/registry';
import { strings } from '@/strings';
import { colors, fontSizes } from '@/theme';

export default function InteractionScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const interaction = findInteraction(slug);

  if (!interaction) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: strings.notFoundTitle }} />
        <Text style={styles.message}>{strings.notFoundBody}</Text>
      </View>
    );
  }

  const { Component, title, fullScreen = false } = interaction;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title, headerShown: !fullScreen }} />
      {fullScreen && <StatusBar hidden />}
      <Component />
      {fullScreen && <FloatingBackButton />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  message: {
    color: colors.textSecondary,
    fontSize: fontSizes.body,
  },
});
