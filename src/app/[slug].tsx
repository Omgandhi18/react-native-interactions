import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

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

  const { Component, title } = interaction;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title }} />
      <Component />
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
