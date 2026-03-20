import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Copy,
  Download,
  ExternalLink,
  Layers3,
  Loader2,
  Save,
  ShieldCheck,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { websitesApi } from '@/lib/api/websites';
import { templatesApi } from '@/lib/api/templates';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  APP_TYPE_OPTIONS,
  CODING_GENERATOR_STORAGE_KEY,
  CODING_TOOL_OPTIONS,
  DEFAULT_CODING_GENERATOR_DRAFT,
  FEATURE_OPTIONS,
  OUTPUT_VARIANT_OPTIONS,
  PRODUCT_REQUIREMENT_FIELDS,
  PRODUCT_REQUIREMENT_SECTIONS,
  PROMPT_STRENGTH_OPTIONS,
  TECH_STACK_CATEGORIES,
  TECH_STACK_OPTIONS,
} from '@/lib/coding-generator/config';
import { buildCodingGeneratorResult, buildExportMarkdown } from '@/lib/coding-generator/engine';
import type {
  CodingFeatureId,
  CodingGeneratorDraft,
  CodingGeneratorResult,
  HandoffTarget,
  OutputVariantId,
  ProductRequirementFieldKey,
  TechStackOptionId,
} from '@/lib/coding-generator/types';
import type { CreateTemplateInput, Website } from '@/types/prompt';

const STEP_TITLES = [
  'Tool',
  'Project',
  'App Type',
  'Features',
  'Stack',
  'Advanced',
  'Mode',
  'Result',
] as const;

function mergeDraft(raw: Partial<CodingGeneratorDraft> | null | undefined): CodingGeneratorDraft {
  return {
    ...DEFAULT_CODING_GENERATOR_DRAFT,
    ...raw,
    productRequirements: {
      ...DEFAULT_CODING_GENERATOR_DRAFT.productRequirements,
      ...raw?.productRequirements,
    },
    advanced: {
      ...DEFAULT_CODING_GENERATOR_DRAFT.advanced,
      ...raw?.advanced,
    },
    selectedFeatureIds: Array.isArray(raw?.selectedFeatureIds)
      ? raw.selectedFeatureIds
      : DEFAULT_CODING_GENERATOR_DRAFT.selectedFeatureIds,
    selectedTechStackIds: Array.isArray(raw?.selectedTechStackIds)
      ? raw.selectedTechStackIds
      : DEFAULT_CODING_GENERATOR_DRAFT.selectedTechStackIds,
  };
}

function cloneDraft(draft: CodingGeneratorDraft): CodingGeneratorDraft {
  return JSON.parse(JSON.stringify(draft)) as CodingGeneratorDraft;
}

function toggleArrayValue<T extends string>(items: T[], value: T): T[] {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}

function selectedLabelCount(values: string[]): string {
  return values.length === 0 ? 'None selected' : `${values.length} selected`;
}

function buildExportFileName(projectName: string): string {
  const base = projectName.trim() || 'ai-coding-generator';
  return `${base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ai-coding-generator'}.md`;
}

function buildCurrentTemplateInput(result: CodingGeneratorResult): CreateTemplateInput {
  const builderState = result.handoff.builder;

  return {
    title: builderState.title,
    description: builderState.description,
    system_prompt: builderState.system_prompt,
    user_prompt: builderState.user_prompt,
    category: builderState.category,
    variables: [],
    model: builderState.model,
    temperature: builderState.temperature,
    max_tokens: builderState.max_tokens,
    tags: builderState.tags,
  };
}

export default function AICodingGenerator() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [activeVariant, setActiveVariant] = useState<OutputVariantId>('full-prompt');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copiedVariant, setCopiedVariant] = useState<OutputVariantId | null>(null);
  const [generatedDraft, setGeneratedDraft] = useState<CodingGeneratorDraft | null>(null);
  const [draft, setDraft] = useState<CodingGeneratorDraft>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_CODING_GENERATOR_DRAFT;
    }

    try {
      const saved = window.localStorage.getItem(CODING_GENERATOR_STORAGE_KEY);
      return mergeDraft(saved ? (JSON.parse(saved) as Partial<CodingGeneratorDraft>) : undefined);
    } catch {
      return DEFAULT_CODING_GENERATOR_DRAFT;
    }
  });

  const draftFingerprint = useMemo(() => JSON.stringify(draft), [draft]);
  const generatedFingerprint = useMemo(
    () => (generatedDraft ? JSON.stringify(generatedDraft) : null),
    [generatedDraft],
  );
  const previewResult = useMemo(() => buildCodingGeneratorResult(draft), [draft]);
  const generatedResult = useMemo(
    () => (generatedDraft ? buildCodingGeneratorResult(generatedDraft) : null),
    [generatedDraft],
  );
  const activeResult = generatedResult ?? previewResult;
  const selectedVariant = activeResult.variantMap[activeVariant];
  const hasGenerated = generatedResult !== null;
  const resultIsStale = hasGenerated && generatedFingerprint !== draftFingerprint;

  const { data: websites, isLoading: websitesLoading, error: websitesError } = useQuery({
    queryKey: ['websites'],
    queryFn: async () => {
      const { data, error } = await websitesApi.list();
      if (error) {
        throw error;
      }
      return (data || []) as Website[];
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      const result = generatedResult;
      if (!result) {
        throw new Error('Generate a prompt bundle first.');
      }

      const { data, error } = await templatesApi.create(buildCurrentTemplateInput(result));
      if (error || !data) {
        throw error ?? new Error('Failed to save template');
      }
      return data;
    },
    onSuccess: (template) => {
      toast.success('Template saved');
      navigate(`/templates/${template.id}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save template');
    },
  });

  useEffect(() => {
    document.title = 'AI Coding Generator';
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CODING_GENERATOR_STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  function updateDraft<K extends keyof CodingGeneratorDraft>(key: K, value: CodingGeneratorDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateAdvanced<K extends keyof CodingGeneratorDraft['advanced']>(
    key: K,
    value: CodingGeneratorDraft['advanced'][K],
  ) {
    setDraft((current) => ({
      ...current,
      advanced: {
        ...current.advanced,
        [key]: value,
      },
    }));
  }

  function updateRequirement(key: ProductRequirementFieldKey, value: string) {
    setDraft((current) => ({
      ...current,
      productRequirements: {
        ...current.productRequirements,
        [key]: value,
      },
    }));
  }

  function handleWebsiteChange(value: string) {
    if (value === 'none') {
      setDraft((current) => ({ ...current, websiteId: '', websiteName: '', websiteContext: '' }));
      return;
    }

    const website = websites?.find((item) => item.id === value);
    setDraft((current) => ({
      ...current,
      websiteId: value,
      websiteName: website?.name ?? '',
      websiteContext: website?.description || website?.url || current.websiteContext,
    }));
  }

  async function handleCopyVariant() {
    try {
      await navigator.clipboard.writeText(selectedVariant.content);
      setCopiedVariant(activeVariant);
      toast.success(`${selectedVariant.label} copied`);
      window.setTimeout(() => setCopiedVariant(null), 1600);
    } catch {
      toast.error('Failed to copy variant');
    }
  }

  function handleExport() {
    const markdown = buildExportMarkdown(activeResult);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = buildExportFileName(activeResult.handoff.builder.projectName);
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Markdown export ready');
  }

  function generatePromptBundle() {
    setGeneratedDraft(cloneDraft(draft));
    toast.success('Prompt bundle generated');
  }

  function handoffTo(target: HandoffTarget) {
    const result = generatedResult;
    if (!result) {
      toast.error('Generate a prompt bundle before handing it off');
      return;
    }

    const path = target === 'builder' ? '/templates/new' : `/${target}`;
    navigate(path, { state: result.handoff[target] });
  }

  const summaryItems = [
    {
      label: 'Tool',
      value:
        CODING_TOOL_OPTIONS.find((item) => item.id === draft.targetToolId)?.shortLabel ?? 'None',
    },
    {
      label: 'App Type',
      value: draft.appTypeId
        ? APP_TYPE_OPTIONS.find((item) => item.id === draft.appTypeId)?.label ?? draft.appTypeId
        : 'Choose one',
    },
    { label: 'Features', value: selectedLabelCount(draft.selectedFeatureIds) },
    { label: 'Stack', value: selectedLabelCount(draft.selectedTechStackIds) },
    {
      label: 'Advanced',
      value: selectedLabelCount(
        Object.values(draft.productRequirements).filter((value) => value.trim().length > 0),
      ),
    },
    {
      label: 'Mode',
      value: `${PROMPT_STRENGTH_OPTIONS.find((item) => item.id === draft.promptStrength)?.label ?? draft.promptStrength} · ${OUTPUT_VARIANT_OPTIONS.find((item) => item.id === draft.outputMode)?.label ?? draft.outputMode}`,
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">AI Coding Generator</h2>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Deterministic prompt assembly for coding agents with guided inputs, stronger product constraints, output variants, and handoff payloads that existing workflows can consume.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Deterministic engine</Badge>
          <Badge variant="secondary">Draft autosave</Badge>
          <Badge variant="secondary">Template save + handoff</Badge>
        </div>
      </div>

      <Card className="xl:hidden">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Prompt readiness</p>
              <p className="text-xs text-muted-foreground">Complete the guided steps to strengthen the handoff.</p>
            </div>
            <Badge variant={previewResult.completeness.ready ? 'default' : 'secondary'}>
              {previewResult.completeness.percent}%
            </Badge>
          </div>
          <Progress value={previewResult.completeness.percent} />
          <div className="grid gap-2 sm:grid-cols-2">
            {summaryItems.map((item) => (
              <div key={item.label} className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-sm font-medium">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Guided flow</p>
                  <p className="text-xs text-muted-foreground">Move step by step or jump ahead if you already know the answer.</p>
                </div>
                <Badge variant="outline">Step {activeStep + 1} / {STEP_TITLES.length}</Badge>
              </div>
              <Progress value={((activeStep + 1) / STEP_TITLES.length) * 100} className="h-2" />
              <div className="grid gap-2 sm:grid-cols-4 xl:grid-cols-8">
                {STEP_TITLES.map((title, index) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => setActiveStep(index)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-left transition-colors',
                      index === activeStep
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/40 hover:bg-accent/40',
                    )}
                  >
                    <p className="text-[11px] text-muted-foreground">{index + 1}</p>
                    <p className="text-sm font-medium">{title}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {activeStep === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bot className="h-5 w-5 text-primary" />
                  1. Choose the target AI coding tool
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  The generated prompt changes tone and execution expectations based on the environment that will consume it.
                </p>
                <div className="grid gap-3 lg:grid-cols-2">
                  {CODING_TOOL_OPTIONS.map((tool) => {
                    const selected = draft.targetToolId === tool.id;
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => updateDraft('targetToolId', tool.id)}
                        className={cn(
                          'rounded-xl border p-4 text-left transition-colors',
                          selected
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-border hover:border-primary/40 hover:bg-accent/30',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{tool.label}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{tool.helper}</p>
                          </div>
                          {selected && <Check className="mt-0.5 h-4 w-4 text-primary" />}
                        </div>
                        <div className="mt-3 rounded-lg bg-background/70 p-3 text-xs text-muted-foreground">
                          Best for: {tool.bestFor}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {activeStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">2. Project and app details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2 lg:col-span-2">
                    <Label htmlFor="project-name">Project or feature name</Label>
                    <Input
                      id="project-name"
                      value={draft.projectName}
                      onChange={(event) => updateDraft('projectName', event.target.value)}
                      placeholder="Example: Customer support command center"
                    />
                    <p className="text-xs text-muted-foreground">Keep it concrete. This becomes the top-level mission for the coding agent.</p>
                  </div>
                  <div className="space-y-2 lg:col-span-2">
                    <Label htmlFor="project-summary">What should the app or feature do?</Label>
                    <Textarea
                      id="project-summary"
                      value={draft.projectSummary}
                      onChange={(event) => updateDraft('projectSummary', event.target.value)}
                      placeholder="Describe the outcome, workflow, and user-facing behavior you want built."
                      className="min-h-[120px]"
                    />
                    <p className="text-xs text-muted-foreground">Include the main workflow, core screens or modules, and what success looks like.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target-users">Who is this for?</Label>
                    <Input
                      id="target-users"
                      value={draft.targetUsers}
                      onChange={(event) => updateDraft('targetUsers', event.target.value)}
                      placeholder="Internal ops managers, recruiters, designers, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Optional website context</Label>
                    <Select value={draft.websiteId || 'none'} onValueChange={handleWebsiteChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Attach saved website context" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No website context</SelectItem>
                        {websites?.map((website) => (
                          <SelectItem key={website.id} value={website.id}>
                            {website.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {websitesLoading
                        ? 'Loading saved websites...'
                        : websitesError
                          ? 'Saved website context is unavailable right now.'
                          : 'Use an existing website or project entry to add more context quickly.'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="current-state">Current state</Label>
                    <Textarea
                      id="current-state"
                      value={draft.currentState}
                      onChange={(event) => updateDraft('currentState', event.target.value)}
                      placeholder="Greenfield, existing repo, partial implementation, design system already exists, etc."
                      className="min-h-[110px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="repo-context">Repo or architecture context</Label>
                    <Textarea
                      id="repo-context"
                      value={draft.repoContext}
                      onChange={(event) => updateDraft('repoContext', event.target.value)}
                      placeholder="Monorepo, package boundaries, existing API layer, auth service, deployment targets, and other constraints."
                      className="min-h-[110px]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">3. Select the app type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">This helps the engine emphasize the right architecture, QA, and deliverable expectations.</p>
                <div className="grid gap-3 lg:grid-cols-2">
                  {APP_TYPE_OPTIONS.map((option) => {
                    const selected = draft.appTypeId === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => updateDraft('appTypeId', option.id)}
                        className={cn(
                          'rounded-xl border p-4 text-left transition-colors',
                          selected
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/40 hover:bg-accent/30',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{option.label}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{option.helper}</p>
                          </div>
                          {selected && <Check className="mt-0.5 h-4 w-4 text-primary" />}
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">{option.deliverableHint}</p>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {activeStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">4. Pick the key features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {FEATURE_OPTIONS.map((feature) => {
                    const selected = draft.selectedFeatureIds.includes(feature.id);
                    return (
                      <button
                        key={feature.id}
                        type="button"
                        onClick={() =>
                          updateDraft(
                            'selectedFeatureIds',
                            toggleArrayValue(draft.selectedFeatureIds, feature.id as CodingFeatureId),
                          )
                        }
                        className={cn(
                          'rounded-xl border p-4 text-left transition-colors',
                          selected
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/40 hover:bg-accent/30',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{feature.label}</p>
                          <Badge variant="outline">{feature.category}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{feature.helper}</p>
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-features">Custom features or workflows</Label>
                  <Textarea
                    id="custom-features"
                    value={draft.customFeatures}
                    onChange={(event) => updateDraft('customFeatures', event.target.value)}
                    placeholder="Add anything unique that the preset feature chips do not cover. Comma-separated or one per line."
                    className="min-h-[100px]"
                  />
                  <p className="text-xs text-muted-foreground">Good examples: audit trail timeline, shift handoff workspace, multi-tenant brand controls, approval queue.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">5. Define the tech stack</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {TECH_STACK_CATEGORIES.map((category) => {
                  const options = TECH_STACK_OPTIONS.filter((option) => option.categoryId === category.id);
                  return (
                    <div key={category.id} className="space-y-3">
                      <div>
                        <p className="font-medium">{category.label}</p>
                        <p className="text-sm text-muted-foreground">{category.helper}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {options.map((option) => {
                          const selected = draft.selectedTechStackIds.includes(option.id);
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() =>
                                updateDraft(
                                  'selectedTechStackIds',
                                  toggleArrayValue(draft.selectedTechStackIds, option.id as TechStackOptionId),
                                )
                              }
                              className={cn(
                                'rounded-full border px-3 py-2 text-sm transition-colors',
                                selected
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border hover:border-primary/40 hover:bg-accent/30',
                              )}
                              title={option.helper}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <div className="space-y-2">
                  <Label htmlFor="custom-stack">Additional stack preferences</Label>
                  <Textarea
                    id="custom-stack"
                    value={draft.customStackNotes}
                    onChange={(event) => updateDraft('customStackNotes', event.target.value)}
                    placeholder="Mention libraries, deployment targets, state management, API styles, or existing packages that should be reused."
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeStep === 5 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  6. Advanced controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((current) => !current)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div>
                      <p className="font-medium">Progressive disclosure</p>
                      <p className="text-sm text-muted-foreground">Add product, delivery, and guardrail details only where they matter. These inputs directly shape the output variants.</p>
                    </div>
                    <ChevronDown className={cn('h-4 w-4 transition-transform', showAdvanced && 'rotate-180')} />
                  </button>
                </div>

                {showAdvanced && (
                  <div className="space-y-5">
                    {PRODUCT_REQUIREMENT_SECTIONS.map((section) => {
                      const fields = PRODUCT_REQUIREMENT_FIELDS.filter((field) => field.sectionId === section.id);
                      return (
                        <div key={section.id} className="space-y-3 rounded-xl border p-4">
                          <div>
                            <p className="font-medium">{section.label}</p>
                            <p className="text-sm text-muted-foreground">{section.helper}</p>
                          </div>
                          <div className="grid gap-4 lg:grid-cols-2">
                            {fields.map((field) => (
                              <div key={field.key} className="space-y-2 lg:col-span-1">
                                <Label htmlFor={`advanced-${field.key}`}>{field.label}</Label>
                                <Textarea
                                  id={`advanced-${field.key}`}
                                  value={draft.productRequirements[field.key]}
                                  onChange={(event) => updateRequirement(field.key, event.target.value)}
                                  placeholder={field.placeholder}
                                  className={cn(field.multiline ? 'min-h-[96px]' : 'min-h-[72px]')}
                                />
                                <p className="text-xs text-muted-foreground">{field.helper}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    <div className="grid gap-3 lg:grid-cols-2">
                      {[
                        ['repoAuditFirst', 'Repo audit first', 'Have the agent inspect the repo before coding.'],
                        ['planBeforeCoding', 'Plan before coding', 'Force planning and sequencing before implementation.'],
                        ['architectureAwareness', 'Architecture awareness', 'Keep changes aligned with the current architecture.'],
                        ['preferExistingPatterns', 'Prefer existing patterns', 'Bias toward extension over invention.'],
                        ['minimalRewrites', 'Minimal rewrites', 'Avoid replacing working code without strong reason.'],
                        ['phasedImplementation', 'Phased implementation', 'Implement in small verifiable slices.'],
                        ['requireTests', 'Require testing', 'Add or run meaningful verification.'],
                        ['requireResponsiveQa', 'Responsive QA', 'Check desktop, tablet, mobile, and edge states for UI work.'],
                        ['deployAfterVerification', 'Deploy after verification', 'Avoid shipping until the work is validated.'],
                        ['includeAcceptanceCriteria', 'Acceptance criteria', 'Make completion objective and reviewable.'],
                        ['includeRollbackNotes', 'Rollback notes', 'Include recovery steps for riskier work.'],
                      ].map(([key, label, helper]) => {
                        const typedKey = key as keyof CodingGeneratorDraft['advanced'];
                        return (
                          <div key={key} className="flex items-start justify-between gap-4 rounded-xl border p-4">
                            <div>
                              <p className="font-medium">{label}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
                            </div>
                            <Switch
                              checked={draft.advanced[typedKey]}
                              onCheckedChange={(checked) => updateAdvanced(typedKey, checked)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="advanced-notes">Extra instructions or non-negotiables</Label>
                  <Textarea
                    id="advanced-notes"
                    value={draft.advancedNotes}
                    onChange={(event) => updateDraft('advancedNotes', event.target.value)}
                    placeholder="Examples: preserve legacy APIs, avoid schema changes, keep changes in one package, or target accessibility AA."
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeStep === 6 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">7. Prompt strength and output mode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 lg:grid-cols-3">
                  {PROMPT_STRENGTH_OPTIONS.map((option) => {
                    const selected = draft.promptStrength === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => updateDraft('promptStrength', option.id)}
                        className={cn(
                          'rounded-xl border p-4 text-left transition-colors',
                          selected
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/40 hover:bg-accent/30',
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">{option.label}</p>
                          {selected && <Check className="h-4 w-4 text-primary" />}
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{option.helper}</p>
                        <p className="mt-3 text-xs text-muted-foreground">{option.difference}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="font-medium">Primary output mode</p>
                    <p className="text-sm text-muted-foreground">All variants are generated, but this selects the one emphasized for copy, save, and handoff.</p>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {OUTPUT_VARIANT_OPTIONS.map((variant) => {
                      const selected = draft.outputMode === variant.id;
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => {
                            updateDraft('outputMode', variant.id);
                            setActiveVariant(variant.id);
                          }}
                          className={cn(
                            'rounded-xl border p-4 text-left transition-colors',
                            selected
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/40 hover:bg-accent/30',
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium">{variant.label}</p>
                            {selected && <Check className="h-4 w-4 text-primary" />}
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{variant.helper}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeStep === 7 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  8. Generate and review the prompt bundle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-medium">Generate Prompt Bundle</p>
                      <p className="text-sm text-muted-foreground">Lock the current inputs into a deterministic prompt bundle before copying, saving, or handing off.</p>
                      {resultIsStale && (
                        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                          Inputs changed after the last generation. Regenerate before using the result actions.
                        </p>
                      )}
                    </div>
                    <Button size="lg" onClick={generatePromptBundle} className="min-w-[220px]">
                      <Sparkles className="mr-2 h-4 w-4" />
                      {hasGenerated ? 'Regenerate Prompt Bundle' : 'Generate Prompt Bundle'}
                    </Button>
                  </div>
                </div>

                {!hasGenerated ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
                    <Wand2 className="mb-4 h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm font-medium">No generated result yet</p>
                    <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                      The generator is deterministic, but this step gives you a deliberate handoff moment and freezes the current draft into copyable output variants and workflow payloads.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-medium">{generatedResult.title}</p>
                        <p className="text-sm text-muted-foreground">{generatedResult.summary}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={handleCopyVariant}>
                          {copiedVariant === activeVariant ? (
                            <Check className="mr-2 h-4 w-4" />
                          ) : (
                            <Copy className="mr-2 h-4 w-4" />
                          )}
                          Copy
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExport}>
                          <Download className="mr-2 h-4 w-4" />
                          Export .md
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => saveTemplateMutation.mutate()}
                          disabled={saveTemplateMutation.isPending || resultIsStale}
                        >
                          {saveTemplateMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          Save as template
                        </Button>
                      </div>
                    </div>

                    <Tabs value={activeVariant} onValueChange={(value) => setActiveVariant(value as OutputVariantId)}>
                      <TabsList className="h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
                        {generatedResult.variants.map((variant) => (
                          <TabsTrigger
                            key={variant.id}
                            value={variant.id}
                            className="rounded-full border px-3 py-1.5 data-[state=active]:border-primary data-[state=active]:bg-primary/10"
                          >
                            {variant.label}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {generatedResult.variants.map((variant) => (
                        <TabsContent key={variant.id} value={variant.id}>
                          <div className="rounded-xl border bg-muted/20 p-4">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">{variant.label}</Badge>
                              <Badge variant="outline">{variant.charCount.toLocaleString()} chars</Badge>
                              <span className="text-xs text-muted-foreground">{variant.helper}</span>
                            </div>
                            <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words text-sm leading-6">{variant.content}</pre>
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>

                    <Separator />

                    <div className="space-y-3">
                      <div>
                        <p className="font-medium">Use the result in another workflow</p>
                        <p className="text-sm text-muted-foreground">The navigation payload includes both the existing prefill fields and the richer generator payload for follow-up integrations.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => handoffTo('builder')} disabled={resultIsStale}>
                          Open in Builder
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                        <Button variant="outline" onClick={() => handoffTo('improve')} disabled={resultIsStale}>
                          Send to Improve
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                        <Button variant="outline" onClick={() => handoffTo('swarm')} disabled={resultIsStale}>
                          Send to Swarm
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setActiveStep((current) => Math.max(0, current - 1))}
              disabled={activeStep === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={() => setActiveStep((current) => Math.min(STEP_TITLES.length - 1, current + 1))}
              disabled={activeStep === STEP_TITLES.length - 1}
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="hidden xl:block">
          <div className="sticky top-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers3 className="h-4 w-4 text-primary" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Completeness guidance</p>
                    <p className="text-xs text-muted-foreground">The page stays useful even if some detail is missing, but richer inputs generate stronger prompts.</p>
                  </div>
                  <Badge variant={previewResult.completeness.ready ? 'default' : 'secondary'}>
                    {previewResult.completeness.percent}%
                  </Badge>
                </div>
                <Progress value={previewResult.completeness.percent} />
                <div className="space-y-3">
                  {summaryItems.map((item) => (
                    <div key={item.label} className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="mt-1 text-sm font-medium">{item.value}</p>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-medium">Missing or worth strengthening</p>
                  {previewResult.completeness.missing.length > 0 ? (
                    <div className="space-y-2">
                      {previewResult.completeness.missing.map((item) => (
                        <div key={item} className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-sm">
                          <Clipboard className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                      All core sections are filled. The prompt bundle is ready to generate.
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <p className="text-sm font-medium">Quick actions</p>
                  <Button className="w-full justify-between" onClick={generatePromptBundle}>
                    {hasGenerated ? 'Regenerate bundle' : 'Generate bundle'}
                    <Sparkles className="h-4 w-4" />
                  </Button>
                  <Button className="w-full justify-between" variant="outline" onClick={handleCopyVariant} disabled={!hasGenerated}>
                    Copy current variant
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button className="w-full justify-between" variant="outline" onClick={handleExport} disabled={!hasGenerated}>
                    Export markdown
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button className="w-full justify-between" variant="outline" onClick={() => setActiveStep(7)}>
                    Jump to result
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
