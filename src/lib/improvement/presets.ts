import type { ImprovementPreset, ImprovementMode } from '@/types/prompt';

export const IMPROVEMENT_PRESETS: ImprovementPreset[] = [
  {
    id: 'general',
    label: 'General',
    icon: '✨',
    description: 'Improve clarity, structure, and effectiveness',
    category: 'General',
    systemPrompt: `You are an expert prompt engineer. Improve the given prompt to be clearer, more structured, and more effective. Output ONLY the improved prompt with no explanation or preamble.`,
  },
  {
    id: 'vibe-code',
    label: 'Vibe Code',
    icon: '🎨',
    description: 'Builder-friendly, intuitive prompts for coding tools',
    category: 'Coding',
    systemPrompt: `You are a vibe coding prompt specialist. Transform the prompt into a cleaner, more intuitive version perfect for AI coding assistants like Cursor, Windsurf, or Claude. Make it builder-friendly, with clear intent, context, and constraints. Use natural language. Output ONLY the improved prompt.`,
  },
  {
    id: 'design',
    label: 'Design',
    icon: '🎯',
    description: 'UI/UX, layout, aesthetics, interaction design prompts',
    category: 'Design',
    systemPrompt: `You are a senior UI/UX design prompt engineer. Transform the prompt to produce stronger design outputs - better layouts, clearer hierarchy, more thoughtful interactions, and more polished visual results. Add design-specific context where missing. Output ONLY the improved prompt.`,
  },
  {
    id: 'n8n',
    label: 'N8N',
    icon: '⚡',
    description: 'Structured automation prompts for N8N workflows',
    category: 'Automation',
    systemPrompt: `You are an N8N workflow automation expert. Transform the prompt to be highly specific for building N8N workflows, including nodes, triggers, conditions, error handling, and data transformations. Make it actionable for automation building. Output ONLY the improved prompt.`,
  },
  {
    id: 'coding',
    label: 'Coding',
    icon: '💻',
    description: 'Implementation-ready prompts for coding agents',
    category: 'Coding',
    systemPrompt: `You are a senior software engineering prompt specialist. Transform the prompt into a highly effective coding prompt that produces clean, maintainable, well-structured code. Include context, constraints, edge cases, and output format expectations. Output ONLY the improved prompt.`,
  },
  {
    id: 'debugging',
    label: 'Debugging',
    icon: '🔍',
    description: 'Error diagnosis and fix prompts',
    category: 'Coding',
    systemPrompt: `You are a debugging expert. Transform the prompt to be maximally effective for diagnosing and fixing code issues. Include error context, expected vs actual behavior, stack traces if relevant, and constraints. Output ONLY the improved prompt.`,
  },
  {
    id: 'seo',
    label: 'SEO',
    icon: '📈',
    description: 'Search optimization and content strategy prompts',
    category: 'Marketing',
    systemPrompt: `You are an SEO prompt engineering expert. Transform the prompt to produce better SEO-optimized content, meta descriptions, keyword strategies, schema markup, and technical SEO recommendations. Output ONLY the improved prompt.`,
  },
  {
    id: 'automation',
    label: 'Automation',
    icon: '🤖',
    description: 'Process automation and workflow prompts',
    category: 'Automation',
    systemPrompt: `You are a process automation expert. Transform the prompt to clearly define automatable processes, including inputs, outputs, triggers, conditions, error handling, and integration points. Make it implementation-ready for tools like N8N, Zapier, or custom scripts. Output ONLY the improved prompt.`,
  },
  {
    id: 'content',
    label: 'Content',
    icon: '📝',
    description: 'Content creation and writing improvement prompts',
    category: 'Content',
    systemPrompt: `You are a content strategy and writing prompt specialist. Transform the prompt to produce higher-quality written content with better structure, tone, clarity, and engagement. Include audience, format, and style guidance. Output ONLY the improved prompt.`,
  },
  {
    id: 'cto-mode',
    label: 'CTO Mode',
    icon: '👔',
    description: 'Strict, explicit, production-grade engineering prompts',
    category: 'Engineering',
    systemPrompt: `You are a CTO-level engineering prompt architect. Transform the prompt to be extremely explicit, production-grade, and unambiguous. Remove all vagueness. Add strict constraints, error handling requirements, performance expectations, edge cases, and acceptance criteria. The prompt should leave zero room for misinterpretation. Output ONLY the improved prompt.`,
  },
  {
    id: 'plan-mode',
    label: 'Plan Mode',
    icon: '📋',
    description: 'Decomposed, multi-step, execution-first prompts',
    category: 'Planning',
    systemPrompt: `You are a technical planning prompt specialist. Transform the prompt into a well-structured, decomposed plan with clear phases, steps, dependencies, deliverables, and success criteria. Make it execution-first with measurable outcomes. Output ONLY the improved prompt.`,
  },
  {
    id: 'prompt-hardening',
    label: 'Prompt Hardening',
    icon: '🛡️',
    description: 'Attack-tested, robust, injection-resistant prompts',
    category: 'Security',
    systemPrompt: `You are a prompt security and robustness expert. Transform the prompt to be more resistant to prompt injection, jailbreaking, and adversarial manipulation. Add guardrails, input validation requirements, output constraints, and safety boundaries while maintaining functionality. Output ONLY the improved prompt.`,
  },
  {
    id: 'multi-agent-coding',
    label: 'Multi-Agent Coding',
    icon: '👥',
    description: 'Prompts designed for multi-agent coding systems',
    category: 'Coding',
    systemPrompt: `You are a multi-agent coding system prompt specialist. Transform the prompt to be effective for multi-agent orchestration where different specialized agents work together. Define clear agent roles, handoff protocols, shared context, and integration points. Output ONLY the improved prompt.`,
  },
  {
    id: 'architecture-planning',
    label: 'Architecture Planning',
    icon: '🏗️',
    description: 'System design and architecture prompts',
    category: 'Architecture',
    systemPrompt: `You are a software architecture prompt specialist. Transform the prompt to produce better system designs, including component breakdowns, data flow, scalability considerations, technology choices, and trade-off analysis. Output ONLY the improved prompt.`,
  },
  {
    id: 'deployment',
    label: 'Deployment',
    icon: '🚀',
    description: 'CI/CD, DevOps, and deployment prompts',
    category: 'DevOps',
    systemPrompt: `You are a DevOps and deployment prompt specialist. Transform the prompt to produce better deployment configurations, CI/CD pipelines, environment setup, monitoring, and infrastructure-as-code results. Include environment-specific details and rollback strategies. Output ONLY the improved prompt.`,
  },
  {
    id: 'refactor',
    label: 'Refactor',
    icon: '♻️',
    description: 'Code refactoring and improvement prompts',
    category: 'Coding',
    systemPrompt: `You are a code refactoring expert. Transform the prompt to produce effective refactoring guidance including pattern identification, step-by-step transformations, testing requirements, and backward compatibility considerations. Output ONLY the improved prompt.`,
  },
];

export function getPreset(mode: ImprovementMode): ImprovementPreset | undefined {
  return IMPROVEMENT_PRESETS.find(p => p.id === mode);
}

export const PRESET_CATEGORIES = [...new Set(IMPROVEMENT_PRESETS.map(p => p.category))];

export const SWARM_MODELS = [
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', role: 'Precision Analyst', roleDescription: 'Focuses on clarity, structure, and instruction precision', provider: 'Anthropic' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', role: 'Creative Optimizer', roleDescription: 'Specializes in creative enhancement and engagement', provider: 'OpenAI' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', role: 'Context Synthesizer', roleDescription: 'Enriches prompts with context and framing', provider: 'Google' },
];
