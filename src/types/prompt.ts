export type PromptCategory = 'seo' | 'content' | 'technical' | 'social' | 'automation' | 'general';

export interface PromptVariable {
  name: string;
  description: string;
  defaultValue: string;
  required: boolean;
}

export interface PromptTemplate {
  id: string;
  user_id: string;
  title: string;
  description: string;
  system_prompt: string;
  user_prompt: string;
  category: PromptCategory;
  variables: PromptVariable[];
  model: string;
  temperature: number;
  max_tokens: number;
  is_favorite: boolean;
  tags: string[];
  version: number;
  website_id: string | null;
  improvement_mode: string | null;
  original_prompt: string | null;
  created_at: string;
  updated_at: string;
}

export interface Website {
  id: string;
  user_id: string;
  name: string;
  url: string | null;
  description: string | null;
  icon: string;
  color: string;
  prompt_count: number;
  last_used_at: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateWebsiteInput {
  name: string;
  url?: string;
  description?: string;
  icon?: string;
  color?: string;
}

export type ImprovementMode = 
  | 'general'
  | 'vibe-code'
  | 'design'
  | 'n8n'
  | 'coding'
  | 'debugging'
  | 'seo'
  | 'automation'
  | 'content'
  | 'cto-mode'
  | 'plan-mode'
  | 'prompt-hardening'
  | 'multi-agent-coding'
  | 'architecture-planning'
  | 'deployment'
  | 'refactor';

export interface ImprovementPreset {
  id: ImprovementMode;
  label: string;
  icon: string;
  description: string;
  systemPrompt: string;
  category: string;
}

export interface PromptImprovement {
  id: string;
  user_id: string;
  template_id: string | null;
  website_id: string | null;
  original_prompt: string;
  improved_prompt: string;
  mode: ImprovementMode;
  is_swarm: boolean;
  swarm_models: string[] | null;
  swarm_roles: string[] | null;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  duration_ms: number;
  created_at: string;
}

export interface SwarmAgent {
  model: string;
  role: string;
  roleDescription: string;
}

export interface SwarmResult {
  agents: {
    model: string;
    role: string;
    response: string;
  }[];
  synthesized: string;
}

export interface PromptExecution {
  id: string;
  user_id: string;
  template_id: string;
  template_title: string;
  model: string;
  input_variables: Record<string, string>;
  messages: ChatMessage[];
  response: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  duration_ms: number;
  status: 'success' | 'error';
  error_message: string | null;
  created_at: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  model?: string;
  tokens?: number;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
  };
}

export interface CreateTemplateInput {
  title: string;
  description: string;
  system_prompt: string;
  user_prompt: string;
  category: PromptCategory;
  variables: PromptVariable[];
  model: string;
  temperature: number;
  max_tokens: number;
  tags: string[];
}

export interface ExecutePromptInput {
  template_id: string;
  variables: Record<string, string>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}
