import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

export function __COMPONENT__() {
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
