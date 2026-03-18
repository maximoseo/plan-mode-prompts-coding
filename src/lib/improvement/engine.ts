import { openrouterApi } from '@/lib/api/openrouter';
import { getPreset } from './presets';
import type { ImprovementMode } from '@/types/prompt';

export interface ImprovementResult {
  original: string;
  improved: string;
  mode: ImprovementMode;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
}

export async function improvePrompt(
  rawPrompt: string,
  mode: ImprovementMode,
  model: string,
): Promise<ImprovementResult> {
  const preset = getPreset(mode);
  const startTime = Date.now();

  const messages = [
    { role: 'system' as const, content: preset?.systemPrompt || getPreset('general')!.systemPrompt },
    { role: 'user' as const, content: rawPrompt },
  ];

  const { data, error } = await openrouterApi.chatCompletion({
    model,
    messages,
    temperature: 0.4,
    max_tokens: 4096,
  });

  if (error || !data) throw error || new Error('Improvement failed');

  return {
    original: rawPrompt,
    improved: data.content,
    mode,
    model,
    promptTokens: data.prompt_tokens,
    completionTokens: data.completion_tokens,
    totalTokens: data.total_tokens,
    durationMs: Date.now() - startTime,
  };
}

export interface SwarmAgentStatus {
  index: number;
  model: string;
  name: string;
  role: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  response: string;
  durationMs: number;
  error?: string;
}

export interface SwarmResult {
  agents: SwarmAgentStatus[];
  synthesized: string;
  totalDurationMs: number;
}

const SWARM_ROLE_PROMPTS: Record<string, string> = {
  'Precision Analyst': `You are a precision-focused prompt engineer. Analyze the given prompt for clarity, logical structure, and instruction completeness. Rewrite it with surgical precision, removing ambiguity and ensuring every instruction is explicit. Output ONLY the improved prompt.`,
  'Creative Optimizer': `You are a creative prompt engineer who specializes in making prompts produce vivid, engaging, and high-quality output. Enhance the prompt with creative direction, tone guidance, and stylistic flourishes. Output ONLY the improved prompt.`,
  'Context Synthesizer': `You are a context-synthesis prompt engineer. Analyze the given prompt and rewrite it with richer context, better framing, and relevant background information. Add helpful constraints and output specifications. Output ONLY the improved prompt.`,
};

const SYNTHESIS_PROMPT = `You are a meta-prompt engineer. You will receive 3 improved versions of a prompt, each created by a different AI model with a different specialization. Synthesize the best elements from all three into one optimal prompt that combines clarity, creativity, and context. Output ONLY the final synthesized prompt, nothing else.`;

export async function runSwarm(
  prompt: string,
  mode: ImprovementMode,
  onAgentUpdate: (agent: SwarmAgentStatus) => void,
): Promise<SwarmResult> {
  const agents = [
    { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', role: 'Precision Analyst' },
    { id: 'openai/gpt-4o', name: 'GPT-4o', role: 'Creative Optimizer' },
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', role: 'Context Synthesizer' },
  ];

  const preset = getPreset(mode);
  const baseSystemPrompt = preset?.systemPrompt || getPreset('general')!.systemPrompt;

  const startTime = Date.now();

  const agentResults = await Promise.all(
    agents.map(async (agent, index): Promise<SwarmAgentStatus> => {
      const agentStart = Date.now();
      try {
        onAgentUpdate({
          index,
          model: agent.id,
          name: agent.name,
          role: agent.role,
          status: 'running',
          response: '',
          durationMs: 0,
        });

        const rolePrompt = SWARM_ROLE_PROMPTS[agent.role] || baseSystemPrompt;

        const { data, error } = await openrouterApi.chatCompletion({
          model: agent.id,
          messages: [
            { role: 'system', content: rolePrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.4,
          max_tokens: 4096,
        });

        const durationMs = Date.now() - agentStart;

        if (error || !data) {
          const result: SwarmAgentStatus = {
            index,
            model: agent.id,
            name: agent.name,
            role: agent.role,
            status: 'error',
            response: '',
            durationMs,
            error: error?.message || 'Unknown error',
          };
          onAgentUpdate(result);
          return result;
        }

        const result: SwarmAgentStatus = {
          index,
          model: agent.id,
          name: agent.name,
          role: agent.role,
          status: 'completed',
          response: data.content.trim(),
          durationMs,
        };
        onAgentUpdate(result);
        return result;
      } catch (err) {
        const durationMs = Date.now() - agentStart;
        const result: SwarmAgentStatus = {
          index,
          model: agent.id,
          name: agent.name,
          role: agent.role,
          status: 'error',
          response: '',
          durationMs,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
        onAgentUpdate(result);
        return result;
      }
    }),
  );

  const completed = agentResults.filter(r => r.status === 'completed');

  let synthesized = '';
  if (completed.length === 0) {
    synthesized = prompt;
  } else if (completed.length === 1) {
    synthesized = completed[0]!.response;
  } else {
    const versions = completed.map((r, i) =>
      `### Version ${i + 1} (${r.name} - ${r.role}):\n${r.response}`,
    );
    const synthInput = `Original prompt:\n${prompt}\n\nImproved versions:\n\n${versions.join('\n\n---\n\n')}`;

    const { data: synthData } = await openrouterApi.chatCompletion({
      model: 'anthropic/claude-sonnet-4',
      messages: [
        { role: 'system', content: SYNTHESIS_PROMPT },
        { role: 'user', content: synthInput },
      ],
      temperature: 0.5,
      max_tokens: 4096,
    });

    synthesized = synthData?.content.trim() || completed[0]!.response;
  }

  return {
    agents: agentResults,
    synthesized,
    totalDurationMs: Date.now() - startTime,
  };
}
