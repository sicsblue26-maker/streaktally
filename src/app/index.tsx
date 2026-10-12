// src/app/index.tsx
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  loadHabits, createHabit, toggleCompletion, deleteHabit, Habit,
} from '@/storage/habits';
import { loadProfile, Profile } from '@/storage/profile';
import { getStreak, todayString } from '@/utils/streaks';
import { colors, habitColors } from '@/theme/colors';
import { supabase } from '@/lib/supabase';

export default function TodayScreen() {
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    const [h, p] = await Promise.all([loadHabits(), loadProfile()]);
    setHabits(h);
    setProfile(p);
  }, []);

  // Refresh whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      (async () => {
        await refresh();
        setLoading(false);
      })();
    }, [refresh])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const onToggle = async (habit: Habit) => {
    const today = todayString();
    const done = habit.completions.includes(today);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Optimistic update
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habit.id
          ? {
              ...h,
              completions: done
                ? h.completions.filter((d) => d !== today)
                : [...h.completions, today],
            }
          : h
      )
    );
    await toggleCompletion(habit.id, today, !done);
  };

  const onDelete = async (habit: Habit) => {
    setHabits((prev) => prev.filter((h) => h.id !== habit.id));
    await deleteHabit(habit.id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading…</Text>
      </SafeAreaView>
    );
  }

  const today = todayString();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Today</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long', month: 'short', day: 'numeric',
            })}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => router.push('/stats')} style={styles.iconBtn}>
            <Text style={styles.iconText}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            {profile?.avatar_url ? (
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              <View style={styles.avatarSmall} />
            ) : (
              <View style={styles.avatarSmall} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {habits.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🌱</Text>
          <Text style={styles.emptyTitle}>No habits yet</Text>
          <Text style={styles.emptyText}>Tap below to create your first habit.</Text>
        </View>
      ) : (
        <FlatList
          data={habits}
          keyExtractor={(h) => h.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => {
            const done = item.completions.includes(today);
            const streak = getStreak(item.completions);
            return (
              <TouchableOpacity
                style={[styles.card, done && styles.cardDone]}
                onPress={() => onToggle(item)}
                onLongPress={() => onDelete(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.emojiWrap, { backgroundColor: item.color + '22' }]}>
                  <Text style={styles.emoji}>{item.emoji}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.name, done && styles.nameDone]}>{item.name}</Text>
                  <Text style={styles.streak}>
                    {streak > 0 ? `🔥 ${streak} day streak` : 'No streak yet'}
                  </Text>
                </View>
                <View style={[styles.check, done && { backgroundColor: item.color, borderColor: item.color }]}>
                  {done && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/add')}>
        <Text style={styles.fabText}>+ Add Habit</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { marginTop: 40, textAlign: 'center', color: colors.textMuted },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { padding: 6 },
  iconText: { fontSize: 22 },
  avatarSmall: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.border,
  },
  title: { fontSize: 32, fontWeight: '800', color: colors.text },
  date: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  list: { padding: 20, paddingBottom: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    padding: 16, borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  cardDone: { opacity: 0.7 },
  emojiWrap: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  emoji: { fontSize: 24 },
  cardBody: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  nameDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  streak: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  check: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 2,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { color: '#fff', fontWeight: '800', fontSize: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 64, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textMuted, marginTop: 6, textAlign: 'center' },
  fab: {
    position: 'absolute', left: 20, right: 20, bottom: 24,
    backgroundColor: colors.accent, paddingVertical: 16, borderRadius: 16,
    alignItems: 'center', shadowColor: colors.accent, shadowOpacity: 0.3,
    shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});