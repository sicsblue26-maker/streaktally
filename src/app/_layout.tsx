//src/app/_layout.tsx
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { loadProfile } from '@/storage/profile';
import AuthScreen from '@/screens/AuthScreen';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );

    return () => subscription.unsubscribe();
  }, []);

  // Load profile when session changes
  useEffect(() => {
    if (!session) {
      setOnboarded(null);
      return;
    }
    (async () => {
      const p = await loadProfile();
      setOnboarded(p?.onboarded ?? false);
    })();
  }, [session]);

  // Redirect based on auth + onboarding state
  useEffect(() => {
    if (loading || !session || onboarded === null) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!onboarded && !inOnboarding) router.replace('/onboarding');
    else if (onboarded && inOnboarding) router.replace('/');
  }, [loading, session, onboarded, segments]);

  if (loading) return null;
  if (!session) return <AuthScreen />;

  return <Stack screenOptions={{ headerShown: false }} />;
}