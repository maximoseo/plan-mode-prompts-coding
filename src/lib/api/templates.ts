import { supabase } from '@/integrations/supabase/client';
import type { PromptTemplate, CreateTemplateInput, PromptVariable } from '@/types/prompt';

export const templatesApi = {
  async list(): Promise<{ data: PromptTemplate[] | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .order('updated_at', { ascending: false });
    return { data, error: error ? new Error(error.message) : null };
  },

  async getById(id: string): Promise<{ data: PromptTemplate | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error: error ? new Error(error.message) : null };
  },

  async create(input: CreateTemplateInput): Promise<{ data: PromptTemplate | null; error: Error | null }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('prompt_templates')
      .insert({
        user_id: user.id,
        title: input.title,
        description: input.description,
        system_prompt: input.system_prompt,
        user_prompt: input.user_prompt,
        category: input.category,
        variables: input.variables as unknown as PromptVariable[],
        model: input.model,
        temperature: input.temperature,
        max_tokens: input.max_tokens,
        tags: input.tags,
      })
      .select()
      .single();
    return { data, error: error ? new Error(error.message) : null };
  },

  async update(id: string, input: Partial<CreateTemplateInput>): Promise<{ data: PromptTemplate | null; error: Error | null }> {
    const updateData: Record<string, unknown> = { ...input };
    if (input.variables) {
      updateData.variables = input.variables as unknown as PromptVariable[];
    }

    const { data, error } = await supabase
      .from('prompt_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    return { data, error: error ? new Error(error.message) : null };
  },

  async delete(id: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
      .from('prompt_templates')
      .delete()
      .eq('id', id);
    return { error: error ? new Error(error.message) : null };
  },

  async toggleFavorite(id: string, isFavorite: boolean): Promise<{ data: PromptTemplate | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('prompt_templates')
      .update({ is_favorite: isFavorite })
      .eq('id', id)
      .select()
      .single();
    return { data, error: error ? new Error(error.message) : null };
  },

  async duplicate(id: string): Promise<{ data: PromptTemplate | null; error: Error | null }> {
    const { data: original, error: fetchError } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !original) {
      return { data: null, error: fetchError ? new Error(fetchError.message) : new Error('Template not found') };
    }

    const { title, description, system_prompt, user_prompt, category, variables, model, temperature, max_tokens, tags } = original;
    const { data, error } = await supabase
      .from('prompt_templates')
      .insert({
        user_id: original.user_id,
        title: `${title} (Copy)`,
        description, system_prompt, user_prompt, category, variables, model, temperature, max_tokens, tags,
      })
      .select()
      .single();
    return { data, error: error ? new Error(error.message) : null };
  },
};
