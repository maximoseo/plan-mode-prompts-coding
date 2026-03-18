import { supabase } from '@/integrations/supabase/client';
import type { Website, CreateWebsiteInput } from '@/types/prompt';

export const websitesApi = {
  async list(): Promise<{ data: Website[] | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('websites')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });
    return { data, error: error ? new Error(error.message) : null };
  },

  async create(input: CreateWebsiteInput): Promise<{ data: Website | null; error: Error | null }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };
    const { data, error } = await supabase
      .from('websites')
      .insert({
        user_id: user.id,
        name: input.name,
        url: input.url || null,
        description: input.description || null,
        icon: input.icon || '🌐',
        color: input.color || '#8b5cf6',
      })
      .select()
      .single();
    return { data, error: error ? new Error(error.message) : null };
  },

  async update(id: string, input: Partial<CreateWebsiteInput>): Promise<{ error: Error | null }> {
    const { error } = await supabase
      .from('websites')
      .update(input)
      .eq('id', id);
    return { error: error ? new Error(error.message) : null };
  },

  async delete(id: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
      .from('websites')
      .delete()
      .eq('id', id);
    return { error: error ? new Error(error.message) : null };
  },

  async togglePin(id: string, isPinned: boolean): Promise<{ error: Error | null }> {
    const { error } = await supabase
      .from('websites')
      .update({ is_pinned: isPinned })
      .eq('id', id);
    return { error: error ? new Error(error.message) : null };
  },
};
