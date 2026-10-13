// src/app/whats-new.tsx
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';

type ChangeType = 'feature' | 'improvement' | 'fix';

type Release = {
  version: string;
  date: string;
  latest?: boolean;
  changes: { type: ChangeType; text: string }[];
};

const RELEASES: Release[] = [
  {
    version: '1.0.0',
    date: 'October 2026',
    latest: true,
    changes: [
      { type: 'feature', text: 'Track unlimited habits with custom emoji and colors' },
      { type: 'feature', text: 'Streaks with flame counter and daily progress' },
      { type: 'feature', text: 'Light and dark themes with system follow' },
      { type: 'feature', text: 'Statistics screen with completion trends' },
      { type: 'feature', text: 'Premium tier foundation — health sync coming soon' },
      { type: 'improvement', text: 'Redesigned sidebar with live progress stats' },
      { type: 'fix', text: 'Haptic feedback now respects system settings' },
    ],
  },
];

const TYPE_META: Record<
  ChangeType,
  { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  feature: {
    label: 'New',
    color: '#10b981',
    icon: 'sparkles-outline',
  },
  improvement: {
    label: 'Improved',
    color: '#3b82f6',
    icon: 'trending-up-outline',
  },
  fix: {
    label: 'Fixed',
    color: '#f59e0b',
    icon: 'construct-outline',
  },
};

export default function WhatsNewScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>What's new</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {RELEASES.map((release) => (
          <View key={release.version} style={styles.release}>
            <View style={styles.releaseHeader}>
              <View style={styles.versionBadge}>
                <Text style={styles.versionText}>v{release.version}</Text>
              </View>
              {release.latest && (
                <View style={styles.latestBadge}>
                  <Text style={styles.latestText}>LATEST</Text>
                </View>
              )}
              <View style={{ flex: 1 }} />
              <Text style={styles.date}>{release.date}</Text>
            </View>

            <View style={styles.card}>
              {release.changes.map((change, i) => {
                const meta = TYPE_META[change.type];
                const isLast = i === release.changes.length - 1;
                return (
                  <View
                    key={`${release.version}-${i}`}
                    style={[styles.changeRow, !isLast && styles.changeRowBorder]}
                  >
                    <View
                      style={[
                        styles.changeIcon,
                        { backgroundColor: meta.color + '18' },
                      ]}
                    >
                      <Ionicons
                        name={meta.icon}
                        size={16}
                        color={meta.color}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.changeLabel, { color: meta.color }]}
                      >
                        {meta.label}
                      </Text>
                      <Text style={styles.changeText}>{change.text}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <Ionicons
            name="heart"
            size={14}
            color={colors.textMuted}
          />
          <Text style={styles.footerText}>
            Thanks for using the app. More coming soon.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 8,
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontSize: 20, fontWeight: '800', color: colors.text },

    content: { padding: 20, paddingBottom: 60 },

    release: { marginBottom: 28 },
    releaseHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      gap: 8,
    },
    versionBadge: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    versionText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
    },
    latestBadge: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    latestText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.6,
    },
    date: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },

    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      overflow: 'hidden',
    },
    changeRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 14,
      gap: 12,
    },
    changeRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    changeIcon: {
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    changeLabel: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    changeText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },

    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 8,
    },
    footerText: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });