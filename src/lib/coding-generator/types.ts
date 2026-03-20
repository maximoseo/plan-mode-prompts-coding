import type { ImprovementMode, PromptCategory } from '@/types/prompt';

export type CodingToolId =
  | 'claude-code'
  | 'github-copilot'
  | 'cursor'
  | 'claude'
  | 'bolt'
  | 'replit-agent'
  | 'v0';

export type CodingAppTypeId =
  | 'full-stack-web'
  | 'frontend-web'
  | 'api-backend'
  | 'mobile-app'
  | 'browser-extension'
  | 'cli-tool'
  | 'ai-agent'
  | 'library-sdk';

export type CodingFeatureId =
  | 'auth'
  | 'dashboard'
  | 'billing'
  | 'cms'
  | 'search'
  | 'notifications'
  | 'analytics'
  | 'admin'
  | 'api-integration'
  | 'realtime'
  | 'ai-workflows'
  | 'offline-sync';

export type TechStackOptionId =
  | 'react'
  | 'nextjs'
  | 'vue'
  | 'typescript'
  | 'tailwind'
  | 'shadcn'
  | 'node'
  | 'express'
  | 'python'
  | 'fastapi'
  | 'postgres'
  | 'prisma'
  | 'supabase'
  | 'redis'
  | 'vitest'
  | 'jest'
  | 'playwright'
  | 'cypress'
  | 'docker'
  | 'vercel'
  | 'render'
  | 'github-actions';

export type PromptStrengthId = 'standard' | 'strong' | 'god';

export type OutputVariantId =
  | 'full-prompt'
  | 'condensed-prompt'
  | 'execution-checklist'
  | 'implementation-brief';

export type HandoffTarget = 'builder' | 'improve' | 'swarm';

export type ProductRequirementFieldKey =
  | 'auth'
  | 'roles'
  | 'dataStorage'
  | 'integrations'
  | 'deployment'
  | 'testing'
  | 'designStyle'
  | 'responsive'
  | 'accessibility'
  | 'performance'
  | 'security'
  | 'seo'
  | 'localization'
  | 'adminWorkflow'
  | 'automation'
  | 'analytics'
  | 'mustNotDo';

export type ProductRequirementSectionId =
  | 'foundation'
  | 'experience'
  | 'quality'
  | 'operations';

export interface CodingToolOption {
  id: CodingToolId;
  label: string;
  shortLabel: string;
  helper: string;
  bestFor: string;
  priority: number;
}

export interface CodingAppTypeOption {
  id: CodingAppTypeId;
  label: string;
  helper: string;
  deliverableHint: string;
}

export interface CodingFeatureOption {
  id: CodingFeatureId;
  label: string;
  helper: string;
  category: string;
}

export interface TechStackOption {
  id: TechStackOptionId;
  label: string;
  helper: string;
  categoryId: string;
}

export interface TechStackCategory {
  id: string;
  label: string;
  helper: string;
}

export interface PromptStrengthOption {
  id: PromptStrengthId;
  label: string;
  helper: string;
  difference: string;
}

export interface OutputVariantOption {
  id: OutputVariantId;
  label: string;
  helper: string;
}

export interface ProductRequirementFieldOption {
  key: ProductRequirementFieldKey;
  sectionId: ProductRequirementSectionId;
  label: string;
  helper: string;
  placeholder: string;
  checklistHint: string;
  multiline?: boolean;
}

export interface ProductRequirementSection {
  id: ProductRequirementSectionId;
  label: string;
  helper: string;
}

export interface ProductRequirementState {
  auth: string;
  roles: string;
  dataStorage: string;
  integrations: string;
  deployment: string;
  testing: string;
  designStyle: string;
  responsive: string;
  accessibility: string;
  performance: string;
  security: string;
  seo: string;
  localization: string;
  adminWorkflow: string;
  automation: string;
  analytics: string;
  mustNotDo: string;
}

export interface AdvancedControlState {
  repoAuditFirst: boolean;
  planBeforeCoding: boolean;
  architectureAwareness: boolean;
  preferExistingPatterns: boolean;
  minimalRewrites: boolean;
  phasedImplementation: boolean;
  requireTests: boolean;
  requireResponsiveQa: boolean;
  deployAfterVerification: boolean;
  includeAcceptanceCriteria: boolean;
  includeRollbackNotes: boolean;
}

export interface CodingGeneratorDraft {
  targetToolId: CodingToolId;
  websiteId: string;
  websiteName: string;
  websiteContext: string;
  projectName: string;
  projectSummary: string;
  targetUsers: string;
  currentState: string;
  repoContext: string;
  appTypeId: CodingAppTypeId | '';
  selectedFeatureIds: CodingFeatureId[];
  customFeatures: string;
  selectedTechStackIds: TechStackOptionId[];
  customStackNotes: string;
  advancedNotes: string;
  productRequirements: ProductRequirementState;
  promptStrength: PromptStrengthId;
  outputMode: OutputVariantId;
  advanced: AdvancedControlState;
}

export interface DraftCompleteness {
  score: number;
  maxScore: number;
  percent: number;
  missing: string[];
  ready: boolean;
}

export interface GeneratedVariant {
  id: OutputVariantId;
  label: string;
  helper: string;
  content: string;
  charCount: number;
}

export interface HandoffPayload {
  initialPrompt: string;
  mode: ImprovementMode;
  title: string;
  description: string;
  category: PromptCategory;
  tags: string[];
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  user_prompt: string;
  source: 'ai-coding-generator';
  target: HandoffTarget;
  createdAt: string;
  projectName: string;
  toolId: CodingToolId;
  appTypeId: CodingAppTypeId | '';
  selectedVariant: OutputVariantId;
  prompt: string;
  condensedPrompt: string;
  checklist: string;
  brief: string;
  draft: CodingGeneratorDraft;
}

export interface CodingGeneratorResult {
  title: string;
  summary: string;
  completeness: DraftCompleteness;
  variants: GeneratedVariant[];
  variantMap: Record<OutputVariantId, GeneratedVariant>;
  handoff: Record<HandoffTarget, HandoffPayload>;
}
