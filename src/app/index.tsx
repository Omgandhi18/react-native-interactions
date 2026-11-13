import { FlatList, StyleSheet, Text } from 'react-native';

import { InteractionCard } from '@/components/InteractionCard';
import { interactionsNewestFirst } from '@/interactions/registry';
import { strings } from '@/strings';
import { colors, fontSizes, spacing } from '@/theme';

export default function GalleryScreen() {
  return (
    <FlatList
      data={interactionsNewestFirst}
      keyExtractor={(interaction) => interaction.slug}
      renderItem={({ item }) => <InteractionCard interaction={item} />}
      ListHeaderComponent={<Text style={styles.subtitle}>{strings.gallerySubtitle}</Text>}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSizes.body,
  },
});
