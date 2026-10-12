// src/app/stats.tsx
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MonthlyHeatMap } from '@symbiot.dev/react-native-heatmap';
import { useTheme } from '@/theme/ThemeContext';
import { supabase } from '@/lib/supabase';

export default function StatsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);

  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('completions')
        .select('completed_date');

      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((row) => {
          counts[row.completed_date] = (counts[row.completed_date] ?? 0) + 1;
        });
        setHeatmapData(counts);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Your Progress</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Consistency</Text>
        <Text style={styles.sectionSubtitle}>
          Days you completed at least one habit
        </Text>

        {loading ? (
          <Text style={styles.loading}>Loading map…</Text>
        ) : (
          <View style={styles.heatmapWrapper}>
            <MonthlyHeatMap
              data={heatmapData}
              theme={{
                scheme: isDark ? 'dark' : 'light',
                light: {
                  cellDefaultColor: colors.heatmapLevel0,
                  cellColor: {
                    1: colors.heatmapLevel1,
                    2: colors.heatmapLevel2,
                    3: colors.heatmapLevel3,
                    4: colors.heatmapLevel4,
                  },
                  headerTextColor: colors.textMuted,
                  sidebarTextColor: colors.textMuted,
                  cellTextColor: colors.textMuted,
                },
                dark: {
                  cellDefaultColor: colors.heatmapLevel0,
                  cellColor: {
                    1: colors.heatmapLevel1,
                    2: colors.heatmapLevel2,
                    3: colors.heatmapLevel3,
                    4: colors.heatmapLevel4,
                  },
                  headerTextColor: colors.textMuted,
                  sidebarTextColor: colors.textMuted,
                  cellTextColor: colors.textMuted,
                },
              }}
            />
          </View>
        )}

        <View style={styles.legend}>
          <Text style={styles.legendText}>Less</Text>
          <View style={[styles.legendDot, { backgroundColor: colors.heatmapLevel0 }]} />
          <View style={[styles.legendDot, { backgroundColor: colors.heatmapLevel1 }]} />
          <View style={[styles.legendDot, { backgroundColor: colors.heatmapLevel2 }]} />
          <View style={[styles.legendDot, { backgroundColor: colors.heatmapLevel3 }]} />
          <View style={[styles.legendDot, { backgroundColor: colors.heatmapLevel4 }]} />
          <Text style={styles.legendText}>More</Text>
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
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
    },
    backBtn: { padding: 8, minWidth: 60 },
    backText: { fontSize: 16, color: colors.accent, fontWeight: '600' },
    title: { fontSize: 20, fontWeight: '700', color: colors.text },
    spacer: { minWidth: 60 },
    content: { padding: 20, paddingBottom: 60 },
    sectionTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: 24,
    },
    loading: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
    heatmapWrapper: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    legend: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 6,
    },
    legendText: { fontSize: 12, color: colors.textMuted },
    legendDot: { width: 12, height: 12, borderRadius: 3 },
  });