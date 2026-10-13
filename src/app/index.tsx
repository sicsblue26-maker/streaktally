// src/app/index.tsx
import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
  Alert,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  loadHabits,
  toggleCompletion,
  deleteHabit,
  Habit,
} from '@/storage/habits';
import { getStreak, todayString } from '@/utils/streaks';
import { useTheme } from '@/theme/ThemeContext';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(310, SCREEN_WIDTH * 0.82);

export default function TodayScreen() {
  const router = useRouter();
  const { colors, isDark, setMode } = useTheme();
  const styles = makeStyles(colors);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const refresh = useCallback(async () => {
    const h = await loadHabits();
    setHabits(h);
  }, []);

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

  const openSidebar = () => {
    setSidebarOpen(true);
    Haptics.selectionAsync().catch(() => {});
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 240,
      useNativeDriver: true,
    }).start();
  };

  const closeSidebar = (afterClose?: () => void) => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSidebarOpen(false);
      afterClose?.();
    });
  };

  const onToggle = async (habit: Habit) => {
    const today = todayString();
    const done = habit.completions.includes(today);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

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

  const onDelete = (habit: Habit) => {
    Alert.alert(
      'Delete habit?',
      `"${habit.name}" will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setHabits((prev) => prev.filter((h) => h.id !== habit.id));
            await deleteHabit(habit.id);
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    closeSidebar(() => {
      Alert.alert('Logout?', 'You can sign back in anytime.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
          },
        },
      ]);
    });
  };

  const goToStats = () => {
    closeSidebar(() => router.push('/stats'));
  };

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setMode(next);
    Haptics.selectionAsync().catch(() => {});
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading…</Text>
      </SafeAreaView>
    );
  }

  const today = todayString();

  // Aggregate stats for the profile header
  const totalHabits = habits.length;
  const completedToday = habits.filter((h) =>
    h.completions.includes(today)
  ).length;
  const bestStreak = habits.reduce(
    (max, h) => Math.max(max, getStreak(h.completions)),
    0
  );

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SIDEBAR_WIDTH, 0],
  });
  const overlayOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.55],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={openSidebar} style={styles.menuBtn}>
            <Ionicons name="menu" size={26} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Today</Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn}>
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={22}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      {habits.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🌱</Text>
          <Text style={styles.emptyTitle}>No habits yet</Text>
          <Text style={styles.emptyText}>
            Tap below to create your first habit.
          </Text>
        </View>
      ) : (
        <FlatList
          data={habits}
          keyExtractor={(h) => h.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.textMuted}
            />
          }
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
                <View
                  style={[
                    styles.emojiWrap,
                    { backgroundColor: item.color + '22' },
                  ]}
                >
                  <Text style={styles.emoji}>{item.emoji}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.name, done && styles.nameDone]}>
                    {item.name}
                  </Text>
                  <Text style={styles.streak}>
                    {streak > 0 ? `🔥 ${streak} day streak` : 'No streak yet'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.check,
                    done && {
                      backgroundColor: item.color,
                      borderColor: item.color,
                    },
                  ]}
                >
                  {done && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add')}
      >
        <Text style={styles.fabText}>+ Add Habit</Text>
      </TouchableOpacity>

      {sidebarOpen && (
        <View style={styles.sidebarContainer}>
          <Animated.View
            style={[styles.backdrop, { opacity: overlayOpacity }]}
          >
            <Pressable
              style={styles.backdropPressable}
              onPress={() => closeSidebar()}
            />
          </Animated.View>

          <Animated.View
            style={[styles.sidebar, { transform: [{ translateX }] }]}
          >
            <SafeAreaView edges={['top']} style={styles.sidebarSafe}>
              {/* Profile / summary header */}
              <View style={styles.profileHeader}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={26} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName}>Your Progress</Text>
                  <Text style={styles.profileSub}>
                    {completedToday}/{totalHabits} done today
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => closeSidebar()}
                  style={styles.closeBtn}
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {/* Mini stat row */}
              <View style={styles.statRow}>
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{completedToday}</Text>
                  <Text style={styles.statLabel}>Today</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{totalHabits}</Text>
                  <Text style={styles.statLabel}>Habits</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{bestStreak}</Text>
                  <Text style={styles.statLabel}>Best 🔥</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Menu items */}
              <View style={styles.sidebarBody}>
                <SidebarItem
                  icon="stats-chart-outline"
                  label="Statistics"
                  colors={colors}
                  onPress={goToStats}
                />
                <SidebarItem
                  icon={isDark ? 'sunny-outline' : 'moon-outline'}
                  label={isDark ? 'Light mode' : 'Dark mode'}
                  colors={colors}
                  onPress={toggleTheme}
                />
                <SidebarItem
                  icon="notifications-outline"
                  label="Reminders"
                  colors={colors}
                  onPress={() => closeSidebar()}
                />
                <SidebarItem
                  icon="settings-outline"
                  label="Settings"
                  colors={colors}
                  onPress={() => closeSidebar()}
                />
              </View>

              {/* Premium card pushed toward bottom */}
              <View style={styles.sidebarFooter}>
                <TouchableOpacity
                  style={styles.premiumCard}
                  activeOpacity={0.85}
                  onPress={() => closeSidebar()}
                >
                  <View style={styles.premiumIconWrap}>
                    <Ionicons name="sparkles" size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.premiumTitle}>Go Premium</Text>
                    <Text style={styles.premiumSubtitle}>
                      Unlimited habits & insights
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#fff"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.logoutRow}
                  onPress={handleLogout}
                  activeOpacity={0.6}
                >
                  <Ionicons
                    name="log-out-outline"
                    size={20}
                    color="#ef4444"
                  />
                  <Text style={styles.logoutLabel}>Logout</Text>
                </TouchableOpacity>

                <Text style={styles.version}>v1.0.0</Text>
              </View>
            </SafeAreaView>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

function SidebarItem({
  icon,
  label,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={sidebarItemStyles.item}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View
        style={[
          sidebarItemStyles.iconWrap,
          { backgroundColor: colors.card },
        ]}
      >
        <Ionicons name={icon} size={18} color={colors.text} />
      </View>
      <Text style={[sidebarItemStyles.label, { color: colors.text }]}>
        {label}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={colors.textMuted}
      />
    </TouchableOpacity>
  );
}

const sidebarItemStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  label: { flex: 1, fontSize: 15, fontWeight: '600' },
});

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loading: { marginTop: 40, textAlign: 'center', color: colors.textMuted },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    menuBtn: { padding: 4 },
    iconBtn: { paddingHorizontal: 8, paddingVertical: 6 },
    title: { fontSize: 28, fontWeight: '800', color: colors.text },
    date: { fontSize: 13, color: colors.textMuted, marginTop: 0 },
    list: { padding: 20, paddingBottom: 100 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardDone: { opacity: 0.7 },
    emojiWrap: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    emoji: { fontSize: 24 },
    cardBody: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600', color: colors.text },
    nameDone: {
      textDecorationLine: 'line-through',
      color: colors.textMuted,
    },
    streak: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    check: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkMark: { color: '#fff', fontWeight: '800', fontSize: 16 },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    emptyEmoji: { fontSize: 64, marginBottom: 12 },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 6,
      textAlign: 'center',
    },
    fab: {
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: 24,
      backgroundColor: colors.accent,
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: 'center',
      shadowColor: colors.accent,
      shadowOpacity: 0.3,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    fabText: { color: '#fff', fontWeight: '700', fontSize: 16 },

    // Sidebar
    sidebarContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000',
    },
    backdropPressable: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    sidebar: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: SIDEBAR_WIDTH,
      backgroundColor: colors.background,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 20,
      shadowOffset: { width: 6, height: 0 },
      elevation: 20,
    },
    sidebarSafe: { flex: 1 },

    // Profile header
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
      gap: 12,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.accent + '18',
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileName: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    profileSub: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },

    // Stat row
    statRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statCell: { flex: 1, alignItems: 'center' },
    statValue: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statDivider: {
      width: 1,
      height: 24,
      backgroundColor: colors.border,
    },

    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: 20,
      marginTop: 16,
    },

    sidebarBody: { flex: 1, paddingHorizontal: 8, paddingTop: 12 },

    // Footer
    sidebarFooter: {
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    premiumCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: 16,
      padding: 14,
      gap: 12,
      shadowColor: colors.accent,
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    premiumIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: '#ffffff30',
      alignItems: 'center',
      justifyContent: 'center',
    },
    premiumTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: '#fff',
    },
    premiumSubtitle: {
      fontSize: 11,
      color: '#ffffffcc',
      marginTop: 1,
    },

    logoutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      marginTop: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#ef444430',
      backgroundColor: '#ef444410',
    },
    logoutLabel: {
      color: '#ef4444',
      fontSize: 14,
      fontWeight: '700',
    },

    version: {
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: 11,
      paddingTop: 12,
    },
  });