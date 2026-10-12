//src/storage/profile.ts
import { supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  onboarded: boolean;
};

export async function loadProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return data;
}

export async function uploadAvatar(localUri: string): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const arraybuffer = await fetch(localUri).then((r) => r.arrayBuffer());
  const path = `${user.id}/avatar.jpg`;

  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(path, arraybuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (upErr) return null;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = `${data.publicUrl}?t=${Date.now()}`; // cache-bust

  await supabase
    .from('profiles')
    .update({ avatar_url: url, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  return url;
}

export async function updateProfile(updates: Partial<Profile>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('profiles').update(updates).eq('id', user.id);
}