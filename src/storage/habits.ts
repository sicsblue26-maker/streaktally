//src/storage/habits.ts
import { supabase } from '@/lib/supabase';

export type Habit = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  created_at: string;
  completions: string[]; // derived from completions table
};

export async function loadHabits(): Promise<Habit[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: habits, error: hErr } = await supabase
    .from('habits')
    .select('*')
    .order('created_at', { ascending: true });

  if (hErr || !habits) return [];

  const { data: comps } = await supabase
    .from('completions')
    .select('habit_id, completed_date');

  const byHabit: Record<string, string[]> = {};
  (comps ?? []).forEach((c) => {
    if (!byHabit[c.habit_id]) byHabit[c.habit_id] = [];
    byHabit[c.habit_id].push(c.completed_date);
  });

  return habits.map((h) => ({
    id: h.id,
    name: h.name,
    emoji: h.emoji,
    color: h.color,
    created_at: h.created_at,
    completions: byHabit[h.id] ?? [],
  }));
}

export async function createHabit(input: {
  name: string;
  emoji: string;
  color: string;
}): Promise<Habit | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('habits')
    .insert({
      user_id: user.id,
      name: input.name.trim(),
      emoji: input.emoji,
      color: input.color,
    })
    .select()
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    emoji: data.emoji,
    color: data.color,
    created_at: data.created_at,
    completions: [],
  };
}

export async function deleteHabit(id: string) {
  await supabase.from('habits').delete().eq('id', id);
}

export async function toggleCompletion(habitId: string, date: string, on: boolean) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (on) {
    await supabase
      .from('completions')
      .upsert(
        { user_id: user.id, habit_id: habitId, completed_date: date },
        { onConflict: 'habit_id,completed_date' }
      );
  } else {
    await supabase
      .from('completions')
      .delete()
      .eq('habit_id', habitId)
      .eq('completed_date', date);
  }
}