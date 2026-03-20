import type { ImprovementMode, PromptCategory } from '@/types/prompt';
import {
  APP_TYPE_OPTIONS,
  CODING_TOOL_OPTIONS,
  FEATURE_OPTIONS,
  OUTPUT_VARIANT_OPTIONS,
  PRODUCT_REQUIREMENT_FIELDS,
  PRODUCT_REQUIREMENT_SECTIONS,
  PROMPT_STRENGTH_OPTIONS,
  TECH_STACK_OPTIONS,
} from './config.ts';
import type {
  CodingAppTypeId,
  CodingGeneratorDraft,
  CodingGeneratorResult,
  DraftCompleteness,
  GeneratedVariant,
  HandoffPayload,
  HandoffTarget,
  OutputVariantId,
  ProductRequirementFieldKey,
  PromptStrengthId,
  TechStackOptionId,
} from './types.ts';

interface StrengthProfile {
  summary: string;
  executionStyle: string;
  extraRules: string[];
}

interface RequirementEntry {
  key: ProductRequirementFieldKey;
  label: string;
  value: string;
  checklistHint: string;
  sectionId: string;
}

const STRENGTH_PROFILES: Record<PromptStrengthId, StrengthProfile> = {
  standard: {
    summary: 'Keep the implementation efficient and focused while still following the requested constraints.',
    executionStyle: 'Work in the smallest sensible set of changes and avoid unnecessary abstractions.',
    extraRules: [
      'Keep the solution practical and avoid speculative architecture unless the requirements clearly need it.',
    ],
  },
  strong: {
    summary: 'Prioritize repo audit, implementation planning, reuse of existing patterns, and verifiable delivery.',
    executionStyle: 'Plan the work in phases, explain tradeoffs briefly, and verify each meaningful step before moving on.',
    extraRules: [
      'Start with a repo audit focused on the files, architecture, and patterns directly relevant to this task.',
      'Create an execution plan before changing code, then implement in small validated slices.',
      'Prefer extending existing abstractions over introducing parallel patterns.',
    ],
  },
  god: {
    summary: 'Operate with maximum rigor, explicit guardrails, and a strong bias toward safe incremental delivery.',
    executionStyle: 'Phase the work into small verifiable increments, justify key technical decisions, and reduce change surface aggressively.',
    extraRules: [
      'Start with a repo audit focused on the files, architecture, and patterns directly relevant to this task.',
      'Do not rewrite large working areas without evidence that the existing structure blocks the requirement.',
      'Phase the work into small verifiable increments with clear checkpoints and regression protection.',
      'Call out risks, assumptions, and any unresolved gaps before finalizing implementation.',
      'Deploy or ship changes only after verification is complete and the implementation is proven stable.',
    ],
  },
};

const TOOL_MODEL_MAP: Record<CodingGeneratorDraft['targetToolId'], string> = {
  'claude-code': 'anthropic/claude-sonnet-4',
  'github-copilot': 'openai/gpt-4o',
  cursor: 'anthropic/claude-sonnet-4',
  claude: 'anthropic/claude-sonnet-4',
  bolt: 'anthropic/claude-sonnet-4',
  'replit-agent': 'google/gemini-2.5-flash',
  v0: 'openai/gpt-4o',
};

function findToolLabel(toolId: CodingGeneratorDraft['targetToolId']): string {
  return CODING_TOOL_OPTIONS.find((tool) => tool.id === toolId)?.label ?? toolId;
}

function findAppTypeLabel(appTypeId: CodingAppTypeId | ''): string {
  if (!appTypeId) {
    return 'Not specified';
  }

  return APP_TYPE_OPTIONS.find((option) => option.id === appTypeId)?.label ?? appTypeId;
}

function techLabel(id: TechStackOptionId): string {
  return TECH_STACK_OPTIONS.find((option) => option.id === id)?.label ?? id;
}

function featureLabel(id: CodingGeneratorDraft['selectedFeatureIds'][number]): string {
  return FEATURE_OPTIONS.find((option) => option.id === id)?.label ?? id;
}

function toSentenceList(items: string[]): string {
  if (items.length === 0) {
    return 'None specified';
  }

  if (items.length === 1) {
    return items[0] ?? '';
  }

  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function splitCustomList(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildFeatureList(draft: CodingGeneratorDraft): string[] {
  return [...draft.selectedFeatureIds.map(featureLabel), ...splitCustomList(draft.customFeatures)];
}

function buildTechStackList(draft: CodingGeneratorDraft): string[] {
  return [...draft.selectedTechStackIds.map(techLabel), ...splitCustomList(draft.customStackNotes)];
}

function buildRequirementEntries(draft: CodingGeneratorDraft): RequirementEntry[] {
  return PRODUCT_REQUIREMENT_FIELDS.flatMap((field) => {
    const value = draft.productRequirements[field.key]?.trim();
    return value
      ? [{ key: field.key, label: field.label, value, checklistHint: field.checklistHint, sectionId: field.sectionId }]
      : [];
  });
}

function buildRequirementSectionLines(draft: CodingGeneratorDraft): string[] {
  const entries = buildRequirementEntries(draft);
  if (entries.length === 0) {
    return ['- No additional advanced product or engineering requirements were specified.'];
  }

  return PRODUCT_REQUIREMENT_SECTIONS.flatMap((section) => {
    const sectionEntries = entries.filter((entry) => entry.sectionId === section.id);
    if (sectionEntries.length === 0) {
      return [];
    }

    return [
      `### ${section.label}`,
      ...sectionEntries.map((entry) => `- ${entry.label}: ${entry.value}`),
      '',
    ];
  }).filter(Boolean);
}

function buildGuardrailLines(draft: CodingGeneratorDraft): string[] {
  const rules: string[] = [];

  if (draft.advanced.repoAuditFirst) {
    rules.push('Audit the current repo, dependencies, and adjacent patterns before making changes.');
  }
  if (draft.advanced.planBeforeCoding) {
    rules.push('Write an implementation plan before coding and keep execution aligned to that plan.');
  }
  if (draft.advanced.architectureAwareness) {
    rules.push('Respect the existing architecture and make changes that fit the project boundaries.');
  }
  if (draft.advanced.preferExistingPatterns) {
    rules.push('Reuse existing components, utilities, conventions, and design-system patterns when practical.');
  }
  if (draft.advanced.minimalRewrites) {
    rules.push('Keep rewrites minimal and only replace working code when there is a clear technical reason.');
  }
  if (draft.advanced.phasedImplementation) {
    rules.push('Implement in phases so each step can be reviewed, tested, and corrected independently.');
  }
  if (draft.advanced.requireTests) {
    rules.push('Add or update automated coverage where sensible and verify the changed behavior before finishing.');
  }
  if (draft.advanced.requireResponsiveQa) {
    rules.push('For any UI work, verify desktop, tablet, and mobile behavior plus key empty and loading states.');
  }
  if (draft.advanced.deployAfterVerification) {
    rules.push('Do not deploy or recommend deployment until verification is complete.');
  }
  if (draft.advanced.includeAcceptanceCriteria) {
    rules.push('Define completion in terms of observable acceptance criteria instead of vague success claims.');
  }
  if (draft.advanced.includeRollbackNotes) {
    rules.push('Document rollback or recovery steps for risky changes.');
  }

  const mustNotDo = draft.productRequirements.mustNotDo.trim();
  if (mustNotDo) {
    rules.push(`Must not do: ${mustNotDo}`);
  }

  return rules;
}

function buildContextLines(draft: CodingGeneratorDraft): string[] {
  const lines = [
    `Project: ${draft.projectName || 'Untitled project'}`,
    `Target AI coding tool: ${findToolLabel(draft.targetToolId)}`,
    `App type: ${findAppTypeLabel(draft.appTypeId)}`,
  ];

  if (draft.websiteName) {
    lines.push(`Website context: ${draft.websiteName}`);
  }
  if (draft.websiteContext.trim()) {
    lines.push(`Website notes: ${draft.websiteContext.trim()}`);
  }
  if (draft.projectSummary.trim()) {
    lines.push(`Project goal: ${draft.projectSummary.trim()}`);
  }
  if (draft.targetUsers.trim()) {
    lines.push(`Target users: ${draft.targetUsers.trim()}`);
  }
  if (draft.currentState.trim()) {
    lines.push(`Current state: ${draft.currentState.trim()}`);
  }
  if (draft.repoContext.trim()) {
    lines.push(`Repo or architecture context: ${draft.repoContext.trim()}`);
  }

  return lines;
}

function buildDeliverables(draft: CodingGeneratorDraft): string[] {
  const deliverables = [
    'Produce code changes that fit the existing repo structure and coding style.',
    'Explain the key implementation decisions and list the files changed.',
  ];

  if (draft.advanced.requireTests || draft.productRequirements.testing.trim()) {
    deliverables.push('List the tests or verification commands that prove the change works.');
  }
  if (draft.advanced.includeAcceptanceCriteria) {
    deliverables.push('Call out the acceptance criteria that are now satisfied.');
  }
  if (draft.advanced.includeRollbackNotes) {
    deliverables.push('Document rollback or recovery notes if the change introduces operational risk.');
  }

  return deliverables;
}

function buildRequirementSummaryLine(draft: CodingGeneratorDraft): string {
  const filled = buildRequirementEntries(draft).map((entry) => `${entry.label}: ${entry.value}`);
  return filled.length > 0 ? toSentenceList(filled) : 'No extra advanced requirements supplied.';
}

function buildFullPrompt(draft: CodingGeneratorDraft, completeness: DraftCompleteness): string {
  const strength = STRENGTH_PROFILES[draft.promptStrength];
  const features = buildFeatureList(draft);
  const stack = buildTechStackList(draft);
  const guardrails = [...strength.extraRules, ...buildGuardrailLines(draft)];
  const deliverables = buildDeliverables(draft);

  return [
    '# Full Prompt',
    '',
    `You are helping implement ${draft.projectName || 'this project'} using ${findToolLabel(draft.targetToolId)}.`,
    '',
    '## Mission',
    `${draft.projectSummary || 'Implement the requested feature with clean, maintainable changes.'}`,
    '',
    '## Context',
    ...buildContextLines(draft).map((line) => `- ${line}`),
    '',
    '## Requested Scope',
    `- Key features: ${toSentenceList(features)}`,
    `- Preferred stack: ${toSentenceList(stack)}`,
    draft.advancedNotes.trim()
      ? `- Additional constraints: ${draft.advancedNotes.trim()}`
      : '- Additional constraints: None specified',
    '',
    '## Product and Engineering Requirements',
    ...buildRequirementSectionLines(draft),
    '## Execution Style',
    `- Prompt strength: ${PROMPT_STRENGTH_OPTIONS.find((option) => option.id === draft.promptStrength)?.label ?? draft.promptStrength}`,
    `- Strength intent: ${strength.summary}`,
    `- Working mode: ${strength.executionStyle}`,
    '',
    '## Non-Negotiable Guardrails',
    ...guardrails.map((rule) => `- ${rule}`),
    '',
    '## Quality Bar',
    '- Keep code typed, maintainable, and aligned to the project design system or established component patterns.',
    '- Prefer incremental edits over large rewrites and preserve working behavior outside the requested scope.',
    '- Make output materially useful for coding agents, not generic advice or thin wrappers.',
    draft.productRequirements.designStyle.trim()
      ? `- Visual direction: ${draft.productRequirements.designStyle.trim()}`
      : '- Visual direction: Preserve the existing design system and avoid generic UI.',
    '',
    '## Deliverables',
    ...deliverables.map((item) => `- ${item}`),
    '',
    '## Suggested Workflow',
    '1. Audit the relevant repo area, identify patterns, and confirm the best extension points.',
    '2. Write a short implementation plan before coding.',
    '3. Implement the feature in small phases with validation after each meaningful change.',
    '4. Verify functional behavior, responsive UX where applicable, and regression risk before finalizing.',
    '5. Report what changed, how it was verified, and any caveats or follow-up work.',
    '',
    '## Input Readiness',
    `- Guided prompt completeness: ${completeness.percent}%`,
    completeness.missing.length > 0
      ? `- Remaining gaps to compensate for carefully: ${toSentenceList(completeness.missing)}`
      : '- The request includes enough context to execute directly.',
  ].join('\n');
}

function buildCondensedPrompt(draft: CodingGeneratorDraft): string {
  const features = toSentenceList(buildFeatureList(draft));
  const stack = toSentenceList(buildTechStackList(draft));
  const coreRules = buildGuardrailLines(draft).slice(0, 6);

  return [
    '# Condensed Prompt',
    '',
    `Use ${findToolLabel(draft.targetToolId)} to implement ${draft.projectName || 'this project'} as a ${findAppTypeLabel(draft.appTypeId)}.`,
    `Goal: ${draft.projectSummary || 'Deliver the requested feature cleanly and safely.'}`,
    `Features: ${features}.`,
    `Tech stack: ${stack}.`,
    `Current state: ${draft.currentState || 'Not specified'}.`,
    `Repo context: ${draft.repoContext || 'Not specified'}.`,
    `Advanced requirements: ${buildRequirementSummaryLine(draft)}`,
    'Guardrails:',
    ...coreRules.map((rule) => `- ${rule}`),
    '- Start with a repo audit, plan before coding, reuse existing patterns, and verify before declaring success.',
  ].join('\n');
}

function buildChecklist(draft: CodingGeneratorDraft): string {
  const features = buildFeatureList(draft);
  const stack = buildTechStackList(draft);
  const requirementChecks = buildRequirementEntries(draft).map((entry) => `- [ ] ${entry.checklistHint}`);

  return [
    '# Execution Checklist',
    '',
    '## Discovery',
    '- [ ] Audit the existing repo area, architecture, and adjacent patterns before writing code.',
    '- [ ] Identify the best insertion points and confirm what should stay unchanged.',
    '',
    '## Plan',
    '- [ ] Write a short implementation plan with phased delivery steps.',
    `- [ ] Confirm scope covers: ${toSentenceList(features)}.`,
    `- [ ] Confirm stack expectations: ${toSentenceList(stack)}.`,
    ...requirementChecks,
    '',
    '## Build',
    '- [ ] Reuse existing components, utilities, and design-system patterns where practical.',
    '- [ ] Keep rewrites minimal and make only the changes needed for the requested behavior.',
    '- [ ] Implement incrementally so each phase can be validated independently.',
    '',
    '## Verify',
    draft.advanced.requireTests || draft.productRequirements.testing.trim()
      ? '- [ ] Run or add targeted automated coverage for the changed behavior.'
      : '- [ ] Verify behavior manually with concrete evidence.',
    draft.advanced.requireResponsiveQa || draft.productRequirements.responsive.trim()
      ? '- [ ] Check responsive behavior, empty states, loading states, and edge cases.'
      : '- [ ] Check primary user flows and important edge cases.',
    '- [ ] Review for architecture fit, maintainability, and unintended regressions.',
    '',
    '## Report Back',
    '- [ ] Summarize files changed and key design decisions.',
    '- [ ] List verification steps and any caveats or follow-up items.',
  ].join('\n');
}

function buildImplementationBrief(draft: CodingGeneratorDraft): string {
  const appType = findAppTypeLabel(draft.appTypeId);
  const features = buildFeatureList(draft);
  const stack = buildTechStackList(draft);
  const requirementEntries = buildRequirementEntries(draft);

  return [
    '# Implementation Brief',
    '',
    `## ${draft.projectName || 'Untitled project'}`,
    '',
    '### Goal',
    draft.projectSummary || 'Implement the requested feature set with maintainable code and strong verification.',
    '',
    '### Product Shape',
    `- App type: ${appType}`,
    `- Target users: ${draft.targetUsers || 'Not specified'}`,
    `- Key features: ${toSentenceList(features)}`,
    '',
    '### Engineering Direction',
    `- Preferred tool: ${findToolLabel(draft.targetToolId)}`,
    `- Preferred stack: ${toSentenceList(stack)}`,
    `- Existing context: ${draft.repoContext || draft.currentState || 'Not specified'}`,
    '',
    '### Detailed Requirements',
    ...(requirementEntries.length > 0
      ? requirementEntries.map((entry) => `- ${entry.label}: ${entry.value}`)
      : ['- No extra advanced requirements supplied.']),
    '',
    '### Build Strategy',
    '- Audit first, plan second, code third.',
    '- Reuse established patterns and avoid unnecessary rewrites.',
    '- Phase work, verify each slice, and report the evidence.',
  ].join('\n');
}

export function getDraftCompleteness(draft: CodingGeneratorDraft): DraftCompleteness {
  const checks = [
    { ok: Boolean(draft.targetToolId), label: 'target AI coding tool' },
    { ok: Boolean(draft.projectName.trim() && draft.projectSummary.trim()), label: 'project details' },
    { ok: Boolean(draft.appTypeId), label: 'app type' },
    { ok: buildFeatureList(draft).length > 0, label: 'key features' },
    { ok: buildTechStackList(draft).length > 0, label: 'tech stack' },
    { ok: buildRequirementEntries(draft).length > 0, label: 'at least one advanced requirement' },
    { ok: Boolean(draft.promptStrength && draft.outputMode), label: 'prompt strength and output mode' },
  ];

  const score = checks.filter((check) => check.ok).length;
  const maxScore = checks.length;
  const percent = Math.round((score / maxScore) * 100);
  const missing = checks.filter((check) => !check.ok).map((check) => `Add ${check.label}`);

  return {
    score,
    maxScore,
    percent,
    missing,
    ready: missing.length === 0,
  };
}

function createVariant(id: OutputVariantId, content: string): GeneratedVariant {
  const config = OUTPUT_VARIANT_OPTIONS.find((variant) => variant.id === id);

  return {
    id,
    label: config?.label ?? id,
    helper: config?.helper ?? '',
    content,
    charCount: content.length,
  };
}

function inferImprovementMode(draft: CodingGeneratorDraft): ImprovementMode {
  if (draft.selectedFeatureIds.includes('ai-workflows')) {
    return 'multi-agent-coding';
  }
  if (draft.appTypeId === 'ai-agent') {
    return 'architecture-planning';
  }
  return 'coding';
}

function inferPromptCategory(): PromptCategory {
  return 'technical';
}

function buildTemplateDescription(draft: CodingGeneratorDraft): string {
  const summary = draft.projectSummary.trim() || 'Generated from AI Coding Generator.';
  const appType = findAppTypeLabel(draft.appTypeId);
  return `${summary} Target tool: ${findToolLabel(draft.targetToolId)}. App type: ${appType}.`;
}

function buildHandoffTags(draft: CodingGeneratorDraft): string[] {
  const tags = [
    'ai-coding-generator',
    draft.targetToolId,
    draft.appTypeId || 'unspecified-app-type',
    draft.promptStrength,
    draft.outputMode,
  ];

  return Array.from(new Set(tags.filter(Boolean)));
}

function createHandoffPayload(
  draft: CodingGeneratorDraft,
  variants: Record<OutputVariantId, GeneratedVariant>,
  target: HandoffTarget,
): HandoffPayload {
  const activePrompt = variants[draft.outputMode].content;
  const model = TOOL_MODEL_MAP[draft.targetToolId];
  const title = `AI Coding Generator - ${draft.projectName || 'Untitled project'}`;
  const description = buildTemplateDescription(draft);
  const mode = inferImprovementMode(draft);

  return {
    initialPrompt: activePrompt,
    mode,
    title,
    description,
    category: inferPromptCategory(),
    tags: buildHandoffTags(draft),
    model,
    temperature: draft.promptStrength === 'god' ? 0.2 : 0.3,
    max_tokens: 4096,
    system_prompt: variants['implementation-brief'].content,
    user_prompt: activePrompt,
    source: 'ai-coding-generator',
    target,
    createdAt: new Date().toISOString(),
    projectName: draft.projectName || 'Untitled project',
    toolId: draft.targetToolId,
    appTypeId: draft.appTypeId,
    selectedVariant: draft.outputMode,
    prompt: activePrompt,
    condensedPrompt: variants['condensed-prompt'].content,
    checklist: variants['execution-checklist'].content,
    brief: variants['implementation-brief'].content,
    draft,
  };
}

export function buildCodingGeneratorResult(draft: CodingGeneratorDraft): CodingGeneratorResult {
  const completeness = getDraftCompleteness(draft);

  const variantMap: Record<OutputVariantId, GeneratedVariant> = {
    'full-prompt': createVariant('full-prompt', buildFullPrompt(draft, completeness)),
    'condensed-prompt': createVariant('condensed-prompt', buildCondensedPrompt(draft)),
    'execution-checklist': createVariant('execution-checklist', buildChecklist(draft)),
    'implementation-brief': createVariant('implementation-brief', buildImplementationBrief(draft)),
  };

  const orderedIds: OutputVariantId[] = [
    'full-prompt',
    'condensed-prompt',
    'execution-checklist',
    'implementation-brief',
  ];

  return {
    title: draft.projectName ? `AI Coding Generator Brief - ${draft.projectName}` : 'AI Coding Generator Brief',
    summary: `Deterministic handoff for ${findToolLabel(draft.targetToolId)} with ${PROMPT_STRENGTH_OPTIONS.find((option) => option.id === draft.promptStrength)?.label ?? draft.promptStrength} guardrails.`,
    completeness,
    variants: orderedIds.map((id) => variantMap[id]),
    variantMap,
    handoff: {
      builder: createHandoffPayload(draft, variantMap, 'builder'),
      improve: createHandoffPayload(draft, variantMap, 'improve'),
      swarm: createHandoffPayload(draft, variantMap, 'swarm'),
    },
  };
}

export function buildExportMarkdown(result: CodingGeneratorResult): string {
  return [
    '# AI Coding Generator',
    '',
    result.summary,
    '',
    `- Completeness: ${result.completeness.percent}%`,
    result.completeness.missing.length > 0
      ? `- Missing: ${toSentenceList(result.completeness.missing)}`
      : '- Missing: None',
    '',
    ...result.variants.flatMap((variant) => [`## ${variant.label}`, '', variant.content, '']),
  ].join('\n');
}
