import { supabase } from '@/integrations/supabase/client';
import type { PromptImprovement } from '@/types/prompt';

export const improvementsApi = {
  async list(limit = 50): Promise<{ data: PromptImprovement[] | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('prompt_improvements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return { data, error: error ? new Error(error.message) : null };
  },

  async create(input: {
    template_id?: string;
    website_id?: string;
    original_prompt: string;
    improved_prompt: string;
    mode: string;
    is_swarm: boolean;
    swarm_models?: string[];
    swarm_roles?: string[];
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    duration_ms: number;
  }): Promise<{ data: PromptImprovement | null; error: Error | null }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };
    const { data, error } = await supabase
      .from('prompt_improvements')
      .insert({ user_id: user.id, ...input })
      .select()
      .single();
    return { data, error: error ? new Error(error.message) : null };
  },

  async delete(id: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
      .from('prompt_improvements')
      .delete()
      .eq('id', id);
    return { error: error ? new Error(error.message) : null };
  },
};
