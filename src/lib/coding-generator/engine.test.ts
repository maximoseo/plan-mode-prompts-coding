import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CODING_GENERATOR_DRAFT } from './config.ts';
import {
  buildCodingGeneratorResult,
  buildExportMarkdown,
  getDraftCompleteness,
} from './engine.ts';
import type { CodingGeneratorDraft } from './types.ts';

const baseDraft: CodingGeneratorDraft = {
  ...DEFAULT_CODING_GENERATOR_DRAFT,
  targetToolId: 'claude-code',
  projectName: 'Orbit Ops',
  projectSummary: 'Build an operations dashboard for field teams with live job tracking and scheduling.',
  targetUsers: 'Operations managers and dispatch coordinators',
  currentState: 'Greenfield app with an existing design system and auth scaffolding already in the repo.',
  repoContext: 'Monorepo with a React frontend, shared UI package, and Node API service.',
  appTypeId: 'full-stack-web',
  selectedFeatureIds: ['auth', 'dashboard', 'notifications'],
  customFeatures: 'Shift handoff timeline with audit history',
  selectedTechStackIds: ['react', 'typescript', 'tailwind', 'node', 'postgres', 'vitest', 'playwright'],
  customStackNotes: 'Prefer TanStack Query and reuse existing card/table components',
  productRequirements: {
    ...DEFAULT_CODING_GENERATOR_DRAFT.productRequirements,
    testing: 'Vitest plus Playwright smoke coverage',
  },
};

test('buildCodingGeneratorResult creates all required output variants', () => {
  const result = buildCodingGeneratorResult(baseDraft);

  assert.equal(result.variants.length, 4);
  assert.equal(result.completeness.percent, 100);
  assert.match(result.title, /AI Coding Generator Brief/);
  assert.match(result.variants[1]?.content ?? '', /Start with a repo audit/);
  assert.match(result.variants[2]?.content ?? '', /Execution Checklist/);
  assert.match(result.variants[3]?.content ?? '', /Implementation Brief/);
});

test('stronger prompt modes inject stricter execution guardrails', () => {
  const result = buildCodingGeneratorResult({
    ...baseDraft,
    promptStrength: 'god',
    outputMode: 'full-prompt',
  });

  const fullPrompt = result.variantMap['full-prompt'].content;
  assert.match(fullPrompt, /Do not rewrite large working areas without evidence/);
  assert.match(fullPrompt, /phase the work into small verifiable increments/i);
  assert.match(fullPrompt, /deploy or ship changes only after verification/i);
});

test('getDraftCompleteness reports missing guided inputs', () => {
  const result = getDraftCompleteness({
    ...DEFAULT_CODING_GENERATOR_DRAFT,
    targetToolId: 'cursor',
  });

  assert.equal(result.ready, false);
  assert.ok(result.percent < 70);
  assert.ok(result.missing.some((item) => item.includes('project details')));
  assert.ok(result.missing.some((item) => item.includes('app type')));
});

test('buildExportMarkdown bundles every output for download', () => {
  const result = buildCodingGeneratorResult(baseDraft);
  const markdown = buildExportMarkdown(result);

  assert.match(markdown, /# AI Coding Generator/);
  assert.match(markdown, /## Full Prompt/);
  assert.match(markdown, /## Condensed Prompt/);
  assert.match(markdown, /## Execution Checklist/);
  assert.match(markdown, /## Implementation Brief/);
});

test('handoff payloads include navigation-state compatible fields', () => {
  const result = buildCodingGeneratorResult(baseDraft);

  assert.equal(result.handoff.builder.title, 'AI Coding Generator - Orbit Ops');
  assert.equal(result.handoff.builder.category, 'technical');
  assert.equal(result.handoff.builder.user_prompt, result.variantMap['full-prompt'].content);
  assert.equal(result.handoff.builder.initialPrompt, result.variantMap['full-prompt'].content);
  assert.equal(result.handoff.improve.initialPrompt, result.variantMap['full-prompt'].content);
  assert.equal(result.handoff.improve.mode, 'coding');
  assert.equal(result.handoff.swarm.initialPrompt, result.variantMap['full-prompt'].content);
});

test('structured advanced requirements appear in generated variants', () => {
  const result = buildCodingGeneratorResult({
    ...baseDraft,
    advanced: {
      ...baseDraft.advanced,
      includeRollbackNotes: true,
    },
    productRequirements: {
      auth: 'Email sign-in plus SSO for internal staff',
      roles: 'Admin, dispatcher, and field technician roles',
      dataStorage: 'PostgreSQL for primary data and object storage for attachments',
      integrations: 'Stripe billing and Slack notifications',
      deployment: 'Deploy frontend to Vercel and API to Render',
      testing: 'Vitest plus Playwright smoke coverage',
      designStyle: 'Dense but polished operational UI using existing cards and tables',
      responsive: 'Desktop first, but tablet-friendly for warehouse devices',
      accessibility: 'WCAG AA keyboard and focus support',
      performance: 'Dashboard should feel instant after initial load with cached queries',
      security: 'Protect admin actions and audit sensitive changes',
      seo: 'Marketing-facing route metadata only for the public site shell',
      localization: 'English now, avoid blocking future RTL support',
      adminWorkflow: 'Admins can approve technician access requests',
      automation: 'Trigger reminder jobs when assignments are overdue',
      analytics: 'Track activation, assignment completion, and alert acknowledgement events',
      mustNotDo: 'Do not rewrite the existing auth flow or swap component libraries',
    },
  });

  const fullPrompt = result.variantMap['full-prompt'].content;
  const brief = result.variantMap['implementation-brief'].content;

  assert.match(fullPrompt, /Email sign-in plus SSO for internal staff/);
  assert.match(fullPrompt, /Stripe billing and Slack notifications/);
  assert.match(fullPrompt, /Do not rewrite the existing auth flow or swap component libraries/);
  assert.match(brief, /WCAG AA keyboard and focus support/);
  assert.match(brief, /English now, avoid blocking future RTL support/);
});
