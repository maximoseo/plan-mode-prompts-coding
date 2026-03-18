import { supabase } from '@/integrations/supabase/client';
import type { PromptExecution, ChatMessage } from '@/types/prompt';

export const executionsApi = {
  async list(limit = 50, offset = 0): Promise<{ data: PromptExecution[] | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('prompt_executions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    return { data, error: error ? new Error(error.message) : null };
  },

  async getByTemplate(templateId: string, limit = 20): Promise<{ data: PromptExecution[] | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('prompt_executions')
      .select('*')
      .eq('template_id', templateId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return { data, error: error ? new Error(error.message) : null };
  },

  async create(input: {
    template_id?: string;
    template_title?: string;
    model: string;
    input_variables: Record<string, string>;
    messages: ChatMessage[];
    response: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    duration_ms: number;
    status: 'success' | 'error';
    error_message?: string | null;
  }): Promise<{ data: PromptExecution | null; error: Error | null }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('prompt_executions')
      .insert({
        user_id: user.id,
        ...input,
      })
      .select()
      .single();
    return { data, error: error ? new Error(error.message) : null };
  },

  async delete(id: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
      .from('prompt_executions')
      .delete()
      .eq('id', id);
    return { error: error ? new Error(error.message) : null };
  },

  async clearAll(): Promise<{ error: Error | null }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('prompt_executions')
      .delete()
      .eq('user_id', user.id);
    return { error: error ? new Error(error.message) : null };
  },
};
