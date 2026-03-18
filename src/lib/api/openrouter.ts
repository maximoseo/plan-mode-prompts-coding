import type { OpenRouterModel, ChatMessage } from '@/types/prompt';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export const openrouterApi = {
  async listModels(): Promise<{ data: OpenRouterModel[] | null; error: Error | null }> {
    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      const models = (json.data || []).map((m: Record<string, unknown>) => ({
        id: m.id as string,
        name: (m.name as string) || (m.id as string),
        description: m.description as string | undefined,
        context_length: (m.context_length as number) || 4096,
        pricing: {
          prompt: (m.pricing as Record<string, string>)?.prompt || '0',
          completion: (m.pricing as Record<string, string>)?.completion || '0',
        },
        top_provider: m.top_provider as { max_completion_tokens?: number } | undefined,
      }));
      return { data: models, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err : new Error('Failed to fetch models') };
    }
  },

  async chatCompletion(params: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  }): Promise<{ data: { content: string; prompt_tokens: number; completion_tokens: number; total_tokens: number } | null; error: Error | null }> {
    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Maximo Prompt Engineering Studio',
        },
        body: JSON.stringify({
          model: params.model,
          messages: params.messages,
          temperature: params.temperature ?? 0.7,
          max_tokens: params.max_tokens ?? 2048,
          stream: params.stream ?? false,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${errBody}`);
      }

      const json = await response.json();
      const choice = json.choices?.[0];
      const usage = json.usage || {};

      return {
        data: {
          content: choice?.message?.content || '',
          prompt_tokens: usage.prompt_tokens || 0,
          completion_tokens: usage.completion_tokens || 0,
          total_tokens: usage.total_tokens || 0,
        },
        error: null,
      };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err : new Error('Chat completion failed') };
    }
  },

  async streamChatCompletion(params: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
    onChunk: (chunk: string) => void;
    onDone: (fullContent: string, usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }, durationMs: number) => void;
    onError: (error: Error) => void;
  }): Promise<void> {
    const startTime = Date.now();
    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Maximo Prompt Engineering Studio',
        },
        body: JSON.stringify({
          model: params.model,
          messages: params.messages,
          temperature: params.temperature ?? 0.7,
          max_tokens: params.max_tokens ?? 2048,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${errBody}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              params.onChunk(content);
            }
          } catch {
            // skip malformed JSON chunks
          }
        }
      }

      const durationMs = Date.now() - startTime;
      params.onDone(fullContent, {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      }, durationMs);
    } catch (err) {
      params.onError(err instanceof Error ? err : new Error('Streaming failed'));
    }
  },
};
