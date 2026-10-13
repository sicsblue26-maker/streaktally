// src/app/profile.tsx
import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeContext';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [initialName, setInitialName] = useState('');
  const [joinedAt, setJoinedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (user) {
          setEmail(user.email ?? '');
          const name =
            (user.user_metadata?.display_name as string | undefined) ?? '';
          setDisplayName(name);
          setInitialName(name);
          if (user.created_at) {
            setJoinedAt(
              new Date(user.created_at).toLocaleDateString(undefined, {
                month: 'long',
                year: 'numeric',
              })
            );
          }
        }
        setLoading(false);
      })();
    }, [])
  );

  const initials = (displayName || email || '?')
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  const isDirty = displayName.trim() !== initialName.trim();

  const handleSave = async () => {
    if (!isDirty || saving) return;
    const name = displayName.trim();
    if (name.length > 40) {
      Alert.alert('Too long', 'Keep your name under 40 characters.');
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    const { error } = await supabase.auth.updateUser({
      data: { display_name: name },
    });

    setSaving(false);

    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }

    setInitialName(name);
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    ).catch(() => {});
    Alert.alert('Saved', 'Your profile has been updated.');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
          <View style={styles.backBtn} />
        </View>
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={styles.avatarBlock}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials || '?'}</Text>
            </View>
            <Text style={styles.avatarHint}>
              Your initials are shown on your profile
            </Text>
          </View>

          {/* Display name */}
          <Text style={styles.fieldLabel}>Display name</Text>
          <View style={styles.inputWrap}>
            <Ionicons
              name="person-outline"
              size={18}
              color={colors.textMuted}
              style={{ marginRight: 10 }}
            />
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="How should we call you?"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              maxLength={40}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            {displayName.length > 0 && (
              <TouchableOpacity onPress={() => setDisplayName('')}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Email (read-only) */}
          <Text style={styles.fieldLabel}>Email</Text>
          <View style={[styles.inputWrap, styles.inputWrapDisabled]}>
            <Ionicons
              name="mail-outline"
              size={18}
              color={colors.textMuted}
              style={{ marginRight: 10 }}
            />
            <Text style={styles.inputDisabled} numberOfLines={1}>
              {email || '—'}
            </Text>
            <View style={styles.lockBadge}>
              <Ionicons
                name="lock-closed"
                size={12}
                color={colors.textMuted}
              />
            </View>
          </View>
          <Text style={styles.helperText}>
            Email can't be changed here. Contact support if you need to update
            it.
          </Text>

          {/* Meta */}
          <View style={styles.metaCard}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Member since</Text>
              <Text style={styles.metaValue}>{joinedAt ?? '—'}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Account ID</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {(email.split('@')[0] ?? '—').slice(0, 12)}…
              </Text>
            </View>
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              (!isDirty || saving) && styles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={!isDirty || saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>
                {isDirty ? 'Save changes' : 'Saved'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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

    avatarBlock: { alignItems: 'center', marginBottom: 28 },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.accent + '20',
      borderWidth: 2,
      borderColor: colors.accent + '60',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.accent,
    },
    avatarHint: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 10,
    },

    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.6,
      marginBottom: 6,
      marginLeft: 4,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 20,
    },
    inputWrapDisabled: { opacity: 0.7 },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      padding: 0,
    },
    inputDisabled: {
      flex: 1,
      fontSize: 15,
      color: colors.textMuted,
    },
    lockBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    helperText: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: -12,
      marginBottom: 24,
      marginLeft: 4,
      lineHeight: 17,
    },

    metaCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingVertical: 4,
      marginBottom: 28,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    metaDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: 16,
    },
    metaLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
    metaValue: { fontSize: 14, color: colors.text, fontWeight: '600' },

    saveBtn: {
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      shadowColor: colors.accent,
      shadowOpacity: 0.3,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
    },
    saveBtnDisabled: {
      backgroundColor: colors.border,
      shadowOpacity: 0,
      elevation: 0,
    },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });