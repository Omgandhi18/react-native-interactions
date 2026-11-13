import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { Interaction } from '@/interactions/types';
import { colors, fontSizes, fontWeights, radii, spacing } from '@/theme';

type Props = {
  interaction: Interaction;
};

export function InteractionCard({ interaction }: Props) {
  const router = useRouter();

  const openInteraction = () => {
    router.push({ pathname: '/[slug]', params: { slug: interaction.slug } });
  };

  return (
    <Pressable
      onPress={openInteraction}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <Text style={styles.title}>{interaction.title}</Text>
      <Text style={styles.description}>{interaction.description}</Text>
      <Text style={styles.date}>{interaction.createdAt}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.xs,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardPressed: {
    backgroundColor: colors.surfacePressed,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSizes.title,
    fontWeight: fontWeights.semibold,
  },
  description: {
    color: colors.textSecondary,
    fontSize: fontSizes.body,
  },
  date: {
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
  },
});
