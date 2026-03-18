export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  category: 'recommended' | 'reasoning' | 'coding' | 'fast' | 'premium' | 'open';
  description: string;
  contextLength: number;
}

export const MODEL_CATALOG: ModelInfo[] = [
  // Recommended - best all-around
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', category: 'recommended', description: 'Best all-around model', contextLength: 128000 },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic', category: 'recommended', description: 'Excellent reasoning & coding', contextLength: 200000 },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', category: 'recommended', description: 'Fast, capable, 1M context', contextLength: 1048576 },
  { id: 'deepseek/deepseek-chat-v3.1', name: 'DeepSeek V3.1', provider: 'DeepSeek', category: 'recommended', description: 'Best value general model', contextLength: 32768 },

  // Reasoning - deep thinkers
  { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4', provider: 'Anthropic', category: 'reasoning', description: 'Highest capability reasoning', contextLength: 200000 },
  { id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5', provider: 'Anthropic', category: 'reasoning', description: 'Extended thinking powerhouse', contextLength: 200000 },
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'Anthropic', category: 'reasoning', description: '1M context with deep thinking', contextLength: 1000000 },
  { id: 'openai/o3', name: 'O3', provider: 'OpenAI', category: 'reasoning', description: 'Strong reasoning model', contextLength: 200000 },
  { id: 'openai/o3-mini', name: 'O3 Mini', provider: 'OpenAI', category: 'reasoning', description: 'Fast reasoning at lower cost', contextLength: 200000 },
  { id: 'openai/o4-mini', name: 'O4 Mini', provider: 'OpenAI', category: 'reasoning', description: 'Efficient deep reasoning', contextLength: 200000 },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek', category: 'reasoning', description: 'Open-source chain-of-thought', contextLength: 64000 },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', category: 'reasoning', description: 'Google\'s best reasoning model', contextLength: 1048576 },
  { id: 'qwen/qwq-32b', name: 'QwQ 32B', provider: 'Qwen', category: 'reasoning', description: 'Alibaba reasoning specialist', contextLength: 32768 },
  { id: 'moonshotai/kimi-k2', name: 'Kimi K2', provider: 'Moonshot', category: 'reasoning', description: 'Strong multilingual reasoning', contextLength: 131000 },

  // Coding - developer focused
  { id: 'openai/gpt-5-codex', name: 'GPT-5 Codex', provider: 'OpenAI', category: 'coding', description: 'Optimized for code generation', contextLength: 400000 },
  { id: 'qwen/qwen3-coder', name: 'Qwen3 Coder', provider: 'Qwen', category: 'coding', description: '262K context coding model', contextLength: 262144 },
  { id: 'qwen/qwen3-coder-plus', name: 'Qwen3 Coder Plus', provider: 'Qwen', category: 'coding', description: 'Enhanced coding with 1M context', contextLength: 1000000 },
  { id: 'mistralai/codestral-2508', name: 'Codestral', provider: 'Mistral', category: 'coding', description: 'Mistral\'s code specialist', contextLength: 256000 },
  { id: 'mistralai/devstral-2512', name: 'Devstral', provider: 'Mistral', category: 'coding', description: 'Agentic coding assistant', contextLength: 262144 },
  { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'Anthropic', category: 'coding', description: 'Strong coding with thinking', contextLength: 200000 },

  // Fast - low latency
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', category: 'fast', description: 'Fast & affordable', contextLength: 128000 },
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', provider: 'Anthropic', category: 'fast', description: 'Ultra-fast Anthropic model', contextLength: 200000 },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic', category: 'fast', description: 'Fast & capable', contextLength: 200000 },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'Google', category: 'fast', description: 'Ultra-fast with 1M context', contextLength: 1048576 },
  { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', provider: 'Google', category: 'fast', description: 'Fastest Gemini, 1M context', contextLength: 1048576 },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek', category: 'fast', description: 'Fast general-purpose model', contextLength: 163840 },
  { id: 'mistralai/mistral-small-3.2-24b-instruct', name: 'Mistral Small 3.2', provider: 'Mistral', category: 'fast', description: 'Fast efficient Mistral', contextLength: 131072 },

  // Premium - cutting edge
  { id: 'openai/gpt-5', name: 'GPT-5', provider: 'OpenAI', category: 'premium', description: 'Latest OpenAI flagship', contextLength: 400000 },
  { id: 'openai/gpt-5.2', name: 'GPT-5.2', provider: 'OpenAI', category: 'premium', description: 'Next-gen OpenAI model', contextLength: 400000 },
  { id: 'anthropic/claude-opus-4.6', name: 'Claude Opus 4.6', provider: 'Anthropic', category: 'premium', description: '1M context flagship', contextLength: 1000000 },
  { id: 'google/gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', provider: 'Google', category: 'premium', description: 'Google\'s newest pro model', contextLength: 1048576 },
  { id: 'openai/gpt-5.4', name: 'GPT-5.4', provider: 'OpenAI', category: 'premium', description: 'Latest GPT with 1M context', contextLength: 1050000 },
  { id: 'z-ai/glm-5-turbo', name: 'GLM-5 Turbo', provider: 'Zhipu AI', category: 'premium', description: 'Zhipu\'s latest flagship', contextLength: 202752 },

  // Open source - community models
  { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta', category: 'open', description: 'Meta\'s latest open model', contextLength: 1048576 },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta', category: 'open', description: 'Proven open-source workhorse', contextLength: 131072 },
  { id: 'qwen/qwen3-235b-a22b', name: 'Qwen3 235B MoE', provider: 'Qwen', category: 'open', description: 'Large MoE open model', contextLength: 131072 },
  { id: 'qwen/qwen3-max', name: 'Qwen3 Max', provider: 'Qwen', category: 'open', description: 'Qwen3 full capability', contextLength: 262144 },
  { id: 'z-ai/glm-4.6', name: 'GLM-4.6', provider: 'Zhipu AI', category: 'open', description: 'Strong Chinese+English model', contextLength: 204800 },
  { id: 'z-ai/glm-4.7', name: 'GLM-4.7', provider: 'Zhipu AI', category: 'open', description: 'Latest GLM open model', contextLength: 202752 },
  { id: 'mistralai/mistral-large-2512', name: 'Mistral Large', provider: 'Mistral', category: 'open', description: 'Mistral\'s flagship model', contextLength: 262144 },
  { id: 'minimax/minimax-m1', name: 'MiniMax M1', provider: 'MiniMax', category: 'open', description: '1M context open model', contextLength: 1000000 },
];

export function getModelsByCategory(category: ModelInfo['category']): ModelInfo[] {
  return MODEL_CATALOG.filter(m => m.category === category);
}

export const CATEGORIES: { key: ModelInfo['category']; label: string; icon: string }[] = [
  { key: 'recommended', label: 'Recommended', icon: 'star' },
  { key: 'reasoning', label: 'Reasoning', icon: 'brain' },
  { key: 'coding', label: 'Coding', icon: 'code' },
  { key: 'fast', label: 'Fast', icon: 'zap' },
  { key: 'premium', label: 'Premium', icon: 'crown' },
  { key: 'open', label: 'Open Source', icon: 'globe' },
];

export const DEFAULT_MODEL = 'openai/gpt-4o';
