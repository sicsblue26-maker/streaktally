// src/app/settings.tsx
import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SectionList,
  Switch,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { supabase } from '@/lib/supabase';

const WEEK_START_KEY = 'settings:weekStart';
const HAPTICS_KEY = 'settings:haptics';
const NOTIF_KEY = 'settings:notifications';

type Row =
  | {
      type: 'nav';
      icon: keyof typeof Ionicons.glyphMap;
      label: string;
      subtitle?: string;
      onPress: () => void;
      danger?: boolean;
      premium?: boolean;
    }
  | {
      type: 'toggle';
      icon: keyof typeof Ionicons.glyphMap;
      label: string;
      subtitle?: string;
      value: boolean;
      onValueChange: (v: boolean) => void;
    }
  | {
      type: 'value';
      icon: keyof typeof Ionicons.glyphMap;
      label: string;
      value: string;
    };

type Section = {
  title: string;
  data: Row[];
};

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, mode, setMode } = useTheme();
  const styles = makeStyles(colors);

  const [notifications, setNotifications] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [weekStart, setWeekStart] = useState<'monday' | 'sunday'>('monday');
  const [email, setEmail] = useState<string>('');

  // Load persisted settings + user email
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [n, h, w] = await Promise.all([
          AsyncStorage.getItem(NOTIF_KEY),
          AsyncStorage.getItem(HAPTICS_KEY),
          AsyncStorage.getItem(WEEK_START_KEY),
        ]);
        if (n !== null) setNotifications(n === 'true');
        if (h !== null) setHapticsEnabled(h === 'true');
        if (w === 'sunday' || w === 'monday') setWeekStart(w);

        const { data } = await supabase.auth.getUser();
        if (data?.user?.email) setEmail(data.user.email);
      })();
    }, [])
  );

  const persist = async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
  };

  const onToggleNotifications = (v: boolean) => {
    setNotifications(v);
    persist(NOTIF_KEY, String(v));
    if (hapticsEnabled) Haptics.selectionAsync().catch(() => {});
  };

  const onToggleHaptics = (v: boolean) => {
    setHapticsEnabled(v);
    persist(HAPTICS_KEY, String(v));
    if (v) Haptics.selectionAsync().catch(() => {});
  };

  const onCycleTheme = () => {
    const next =
      mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
    setMode(next);
    if (hapticsEnabled) Haptics.selectionAsync().catch(() => {});
  };

  const onCycleWeekStart = () => {
    const next = weekStart === 'monday' ? 'sunday' : 'monday';
    setWeekStart(next);
    persist(WEEK_START_KEY, next);
    if (hapticsEnabled) Haptics.selectionAsync().catch(() => {});
  };

  const handleChangePassword = () => {
    if (!email) {
      Alert.alert('Not signed in', 'Sign in first to change your password.');
      return;
    }
    Alert.alert(
      'Reset password',
      `We'll email a reset link to ${email}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send link',
          onPress: async () => {
            const { error } = await supabase.auth.resetPasswordForEmail(
              email
            );
            if (error) {
              Alert.alert('Could not send', error.message);
            } else {
              Alert.alert('Check your inbox', 'Reset link sent.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This permanently erases your account, habits, and history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Last chance. This is irreversible.',
              [
                { text: 'Keep my account', style: 'cancel' },
                {
                  text: 'Delete forever',
                  style: 'destructive',
                  onPress: async () => {
                    // Requires a Supabase Edge Function or RPC to delete the
                    // auth user. From the client you can only delete owned data.
                    // Example:
                    // const { error } = await supabase.rpc('delete_my_account');
                    Alert.alert(
                      'Contact support',
                      'Account deletion requires a backend call. Wire this to your Supabase RPC.'
                    );
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const openUrl = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) Linking.openURL(url);
    else Alert.alert('Cannot open link', url);
  };

  const openPrivacy = () =>
    openUrl('https://yourapp.com/privacy'); // TODO: replace
  const openTerms = () =>
    openUrl('https://yourapp.com/terms'); // TODO: replace

  const sections: Section[] = [
    {
      title: 'ACCOUNT',
      data: [
        {
          type: 'nav',
          icon: 'person-outline',
          label: 'Profile',
          subtitle: email || 'Not signed in',
          onPress: () => router.push('/profile'),
        },
        {
          type: 'nav',
          icon: 'key-outline',
          label: 'Change password',
          onPress: handleChangePassword,
        },
        {
          type: 'nav',
          icon: 'trash-outline',
          label: 'Delete account',
          danger: true,
          onPress: handleDeleteAccount,
        },
      ],
    },
    {
      title: 'APPEARANCE',
      data: [
        {
          type: 'value',
          icon: 'contrast-outline',
          label: 'Theme',
          value:
            mode === 'system'
              ? 'System'
              : mode === 'dark'
              ? 'Dark'
              : 'Light',
        },
        {
          type: 'value',
          icon: 'calendar-outline',
          label: 'Week starts on',
          value: weekStart === 'monday' ? 'Monday' : 'Sunday',
        },
      ],
    },
    {
      title: 'NOTIFICATIONS',
      data: [
        {
          type: 'toggle',
          icon: 'notifications-outline',
          label: 'Enable reminders',
          subtitle: 'Get nudges for habits you have not done yet',
          value: notifications,
          onValueChange: onToggleNotifications,
        },
        {
          type: 'toggle',
          icon: 'pulse-outline',
          label: 'Haptic feedback',
          value: hapticsEnabled,
          onValueChange: onToggleHaptics,
        },
      ],
    },
    {
      title: 'ABOUT',
      data: [
        {
          type: 'value',
          icon: 'information-circle-outline',
          label: 'Version',
          value: '1.0.0',
        },
        {
          type: 'nav',
          icon: 'shield-checkmark-outline',
          label: 'Privacy policy',
          onPress: openPrivacy,
        },
        {
          type: 'nav',
          icon: 'document-text-outline',
          label: 'Terms of service',
          onPress: openTerms,
        },
        {
          type: 'nav',
          icon: 'sparkles-outline',
          label: "What's new",
          onPress: () => router.push('/whats-new'),
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.backBtn} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${item.label}-${index}`}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item, index, section }) => {
          const isFirst = index === 0;
          const isLast = index === section.data.length - 1;
          return (
            <SettingsRow
              row={item}
              styles={styles}
              colors={colors}
              isFirst={isFirst}
              isLast={isLast}
              onPressOverride={
                item.type === 'value'
                  ? item.label === 'Theme'
                    ? onCycleTheme
                    : item.label === 'Week starts on'
                    ? onCycleWeekStart
                    : undefined
                  : undefined
              }
            />
          );
        }}
      />
    </SafeAreaView>
  );
}

function SettingsRow({
  row,
  styles,
  colors,
  isFirst,
  isLast,
  onPressOverride,
}: {
  row: Row;
  styles: any;
  colors: any;
  isFirst: boolean;
  isLast: boolean;
  onPressOverride?: () => void;
}) {
  const radiusStyle = {
    borderTopLeftRadius: isFirst ? 14 : 0,
    borderTopRightRadius: isFirst ? 14 : 0,
    borderBottomLeftRadius: isLast ? 14 : 0,
    borderBottomRightRadius: isLast ? 14 : 0,
  };

  const showDivider = !isLast;

  if (row.type === 'toggle') {
    return (
      <View style={[styles.row, radiusStyle]}>
        <View style={styles.rowIconWrap}>
          <Ionicons name={row.icon} size={18} color={colors.text} />
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowLabel}>{row.label}</Text>
          {row.subtitle ? (
            <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
          ) : null}
        </View>
        <Switch
          value={row.value}
          onValueChange={row.onValueChange}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
        />
        {showDivider && <View style={styles.divider} />}
      </View>
    );
  }

  const isValueRow = row.type === 'value';
  const onPress = isValueRow ? onPressOverride : row.onPress;

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.6 : 1}
      onPress={onPress}
      style={[styles.row, radiusStyle]}
    >
      <View
        style={[
          styles.rowIconWrap,
          row.type === 'nav' && row.danger && styles.rowIconWrapDanger,
        ]}
      >
        <Ionicons
          name={row.icon}
          size={18}
          color={
            row.type === 'nav' && row.danger ? '#ef4444' : colors.text
          }
        />
      </View>
      <View style={styles.rowBody}>
        <Text
          style={[
            styles.rowLabel,
            row.type === 'nav' && row.danger && styles.rowLabelDanger,
          ]}
        >
          {row.label}
        </Text>
        {row.type === 'nav' && row.subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {row.subtitle}
          </Text>
        ) : null}
      </View>

      {isValueRow ? (
        <Text style={styles.rowValue}>{row.value}</Text>
      ) : null}

      {row.type === 'nav' && row.premium ? (
        <View style={styles.proBadge}>
          <Text style={styles.proBadgeText}>PRO</Text>
        </View>
      ) : null}

      {onPress ? (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.textMuted}
        />
      ) : null}

      {showDivider && <View style={styles.divider} />}
    </TouchableOpacity>
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

    listContent: { paddingHorizontal: 16, paddingBottom: 40 },

    sectionHeader: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.8,
      marginTop: 24,
      marginBottom: 8,
      paddingHorizontal: 4,
    },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderTopWidth: 0,
      overflow: 'hidden',
    },
    rowIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    rowIconWrapDanger: {
      backgroundColor: '#ef444418',
    },
    rowBody: { flex: 1, marginRight: 8 },
    rowLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
    rowLabelDanger: { color: '#ef4444' },
    rowSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    rowValue: {
      fontSize: 14,
      color: colors.textMuted,
      marginRight: 6,
    },

    divider: {
      position: 'absolute',
      left: 60,
      right: 0,
      bottom: 0,
      height: 1,
      backgroundColor: colors.border,
    },

    proBadge: {
      backgroundColor: colors.accent,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginRight: 6,
    },
    proBadgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
  });