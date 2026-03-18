import { openrouterApi } from '@/lib/api/openrouter';
import { getPreset } from './presets';
import type { ImprovementMode, SwarmResult, SwarmAgent } from '@/types/prompt';

export const SWARM_MODELS = [
  'anthropic/claude-sonnet-4',
  'openai/gpt-4o',
  'google/gemini-2.5-pro',
];

export function getSwarmRoles(mode: ImprovementMode): SwarmAgent[] {
  const basePreset = getPreset(mode);
  const baseSystemPrompt = basePreset?.systemPrompt || getPreset('general')!.systemPrompt;

  return SWARM_MODELS.map((model, i) => {
    const roles = getRolesForMode(mode);
    const agent = roles[i] || roles[0]!;
    return {
      model,
      role: agent.role,
      roleDescription: `${baseSystemPrompt}\n\nAdditionally, approach this from the perspective of: ${agent!.perspective}. Focus on: ${agent!.focus}.`,
    };
  });
}

function getRolesForMode(mode: ImprovementMode): Array<{ role: string; perspective: string; focus: string }> {
  const roleMap: Record<string, Array<{ role: string; perspective: string; focus: string }>> = {
    general: [
      { role: 'Clarity Expert', perspective: 'a clarity and simplicity specialist', focus: 'making the prompt clear, unambiguous, and easy to follow' },
      { role: 'Structure Architect', perspective: 'a prompt structure specialist', focus: 'organizing the prompt with proper sections, constraints, and output format' },
      { role: 'Effectiveness Optimizer', perspective: 'an AI effectiveness specialist', focus: 'maximizing the quality and usefulness of the AI response' },
    ],
    coding: [
      { role: 'Requirements Analyst', perspective: 'a requirements engineering specialist', focus: 'ensuring all requirements are explicit, testable, and unambiguous' },
      { role: 'Code Quality Expert', perspective: 'a code quality specialist', focus: 'producing clean, maintainable, well-documented code' },
      { role: 'Edge Case Hunter', perspective: 'a QA and edge case specialist', focus: 'identifying edge cases, error conditions, and robustness requirements' },
    ],
    'vibe-code': [
      { role: 'Context Setter', perspective: 'a coding context specialist', focus: 'setting clear project context, tech stack, and conventions' },
      { role: 'Task Decomposer', perspective: 'a task breakdown specialist', focus: 'breaking complex tasks into clear, sequential steps' },
      { role: 'Format Optimizer', perspective: 'an output format specialist', focus: 'ensuring the output format matches what coding tools expect' },
    ],
    design: [
      { role: 'UX Strategist', perspective: 'a user experience specialist', focus: 'user-centered design thinking and usability' },
      { role: 'Visual Architect', perspective: 'a visual design specialist', focus: 'layout, spacing, color, typography, and visual hierarchy' },
      { role: 'Interaction Designer', perspective: 'an interaction design specialist', focus: 'animations, transitions, states, and user flows' },
    ],
    n8n: [
      { role: 'Flow Architect', perspective: 'an N8N workflow architect', focus: 'node structure, connections, and data flow' },
      { role: 'Error Handler', perspective: 'an error handling specialist', focus: 'error nodes, retry logic, and fallback strategies' },
      { role: 'Integration Expert', perspective: 'an API integration specialist', focus: 'API calls, authentication, data transformation, and webhooks' },
    ],
    'plan-mode': [
      { role: 'Scope Definer', perspective: 'a project scoping specialist', focus: 'defining clear boundaries, deliverables, and constraints' },
      { role: 'Phase Planner', perspective: 'a project planning specialist', focus: 'breaking work into phases with dependencies and milestones' },
      { role: 'Risk Assessor', perspective: 'a risk assessment specialist', focus: 'identifying risks, blockers, and mitigation strategies' },
    ],
    'cto-mode': [
      { role: 'Tech Lead', perspective: 'a technical leadership specialist', focus: 'production-grade requirements and engineering standards' },
      { role: 'Security Reviewer', perspective: 'a security engineering specialist', focus: 'security constraints, input validation, and attack prevention' },
      { role: 'Performance Engineer', perspective: 'a performance optimization specialist', focus: 'scalability, caching, and performance requirements' },
    ],
  };

  return roleMap[mode] || roleMap.general!;
}

export async function runSwarm(
  rawPrompt: string,
  mode: ImprovementMode,
  onAgentProgress?: (index: number, model: string, role: string) => void,
  onAgentComplete?: (index: number, response: string) => void,
): Promise<SwarmResult> {
  const agents = getSwarmRoles(mode);
  const agentResults: Array<{ model: string; role: string; response: string }> = [];

  const promises = agents.map(async (agent, i) => {
    onAgentProgress?.(i, agent.model, agent.role);

    const { data, error } = await openrouterApi.chatCompletion({
      model: agent.model,
      messages: [
        { role: 'system', content: agent.roleDescription },
        { role: 'user', content: rawPrompt },
      ],
      temperature: 0.5,
      max_tokens: 4096,
    });

    if (error || !data) throw error || new Error(`Agent ${agent.role} failed`);

    const result = { model: agent.model, role: agent.role, response: data.content };
    onAgentComplete?.(i, data.content);
    return result;
  });

  const results = await Promise.all(promises);
  agentResults.push(...results);

  const synthMessages = [
    {
      role: 'system' as const,
      content: `You are a prompt synthesis expert. You have been given 3 different AI perspectives on improving the same prompt. Your job is to create the SINGLE BEST possible prompt by taking the strongest elements from each perspective.

The final prompt must:
- Be clear, structured, and unambiguous
- Incorporate the best insights from all 3 perspectives
- Be more effective than any single perspective alone
- Be ready to use immediately

Output ONLY the final improved prompt. No explanation, no preamble.`,
    },
    {
      role: 'user' as const,
      content: `ORIGINAL PROMPT:\n${rawPrompt}\n\n` +
        agentResults.map((r) =>
          `--- ${r.role} (${r.model}) ---\n${r.response}`
        ).join('\n\n') +
        '\n\nNow synthesize the best possible prompt from all perspectives above.',
    },
  ];

  const { data: synthData, error: synthError } = await openrouterApi.chatCompletion({
    model: 'anthropic/claude-sonnet-4',
    messages: synthMessages,
    temperature: 0.3,
    max_tokens: 4096,
  });

  if (synthError || !synthData) throw synthError || new Error('Synthesis failed');

  return {
    agents: agentResults,
    synthesized: synthData.content,
  };
}
