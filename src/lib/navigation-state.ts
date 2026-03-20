import { IMPROVEMENT_PRESETS } from '@/lib/improvement/presets';
import type { ImprovementMode, PromptCategory } from '@/types/prompt';

const improvementModes = new Set<ImprovementMode>(
  IMPROVEMENT_PRESETS.map(({ id }) => id),
);
const promptCategories = new Set<PromptCategory>([
  'seo',
  'content',
  'technical',
  'social',
  'automation',
  'general',
]);

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getMode(value: unknown): ImprovementMode | undefined {
  return typeof value === 'string' && improvementModes.has(value as ImprovementMode)
    ? (value as ImprovementMode)
    : undefined;
}

function getCategory(value: unknown): PromptCategory | undefined {
  return typeof value === 'string' && promptCategories.has(value as PromptCategory)
    ? (value as PromptCategory)
    : undefined;
}

function getTags(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (Array.isArray(value)) {
    const tags = value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);

    return tags.length > 0 ? tags.join(', ') : undefined;
  }

  return undefined;
}

function hasDefinedValue(values: Array<unknown>): boolean {
  return values.some((value) => value !== undefined);
}

export interface PromptFlowNavigationState {
  initialPrompt?: string;
  mode?: ImprovementMode;
  title?: string;
  model?: string;
}

export interface BuilderNavigationState extends PromptFlowNavigationState {
  description?: string;
  category?: PromptCategory;
  tags?: string;
  temperature?: number;
  max_tokens?: number;
  system_prompt?: string;
  user_prompt?: string;
}

export function getPromptFlowNavigationState(
  state: unknown,
): PromptFlowNavigationState | null {
  if (!isRecord(state)) {
    return null;
  }

  const normalized: PromptFlowNavigationState = {
    initialPrompt: getString(state.initialPrompt),
    mode: getMode(state.mode),
    title: getString(state.title),
    model: getString(state.model),
  };

  return hasDefinedValue(Object.values(normalized)) ? normalized : null;
}

export function getBuilderNavigationState(state: unknown): BuilderNavigationState | null {
  if (!isRecord(state)) {
    return null;
  }

  const normalized: BuilderNavigationState = {
    title: getString(state.title),
    description: getString(state.description),
    category: getCategory(state.category),
    tags: getTags(state.tags),
    model: getString(state.model),
    temperature: getNumber(state.temperature),
    max_tokens: getNumber(state.max_tokens),
    system_prompt: getString(state.system_prompt),
    user_prompt: getString(state.user_prompt),
    initialPrompt: getString(state.initialPrompt),
    mode: getMode(state.mode),
  };

  return hasDefinedValue(Object.values(normalized)) ? normalized : null;
}
