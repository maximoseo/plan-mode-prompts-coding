import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { templatesApi } from '@/lib/api/templates';
import { openrouterApi } from '@/lib/api/openrouter';
import { getBuilderNavigationState } from '@/lib/navigation-state';
import {
  extractVariables,
  fillVariables,
  getMissingVariables,
  estimateTokens,
  formatTokenCount,
} from '@/lib/prompt-utils';
import type {
  PromptVariable,
  CreateTemplateInput,
} from '@/types/prompt';
import { useModelSelection } from '@/hooks/useModelSelection';
import { ModelSelector } from '@/components/ModelSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Save,
  Play,
  X,
  Plus,
  Trash2,
  Loader2,
  Wand2,
  Eye,
  TestTube,
  ChevronLeft,
} from 'lucide-react';

const categories: PromptCategory[] = [
  'seo',
  'content',
  'technical',
  'social',
  'automation',
  'general',
];

type PromptCategory = 'seo' | 'content' | 'technical' | 'social' | 'automation' | 'general';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  category: z.string().default('general'),
  tags: z.string().default(''),
  model: z.string().default(''),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().min(256).max(8192).default(2048),
  system_prompt: z.string().default(''),
  user_prompt: z.string().min(1, 'User prompt is required'),
});

type FormData = z.infer<typeof formSchema>;

function VariableHighlight({ text }: { text: string }) {
  const parts = text.split(/(\{\{\w+}})/g);
  return (
    <span className="text-sm text-muted-foreground font-mono whitespace-pre-wrap break-all">
      {parts.map((part, i) =>
        /^\{\{\w+}}$/.test(part) ? (
          <span
            key={i}
            className="inline-block bg-primary/15 text-primary font-semibold rounded px-1 mx-0.5"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

interface PromptEditorProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onDetect: () => void;
}

function PromptEditor({ label, value, onChange, onDetect }: PromptEditorProps) {
  const tokens = estimateTokens(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button type="button" variant="ghost" size="sm" onClick={onDetect}>
          <Wand2 className="mr-1 h-3 w-3" />
          Auto-detect variables
        </Button>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[160px] font-mono text-sm resize-y"
        placeholder={`Write your ${label.toLowerCase()} here...`}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{value.length} characters</span>
        <span>~{formatTokenCount(tokens)} tokens</span>
      </div>
      {value && /\{\{\w+}}/.test(value) && (
        <div className="rounded-md border bg-muted/30 p-3 max-h-[120px] overflow-auto">
          <p className="text-xs text-muted-foreground mb-1">Variable preview:</p>
          <VariableHighlight text={value} />
        </div>
      )}
    </div>
  );
}

export default function Builder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = !id;

  const { selectedModel, selectModel, availableModels, isLoading: modelsLoading } = useModelSelection();

  const [variables, setVariables] = useState<PromptVariable[]>([]);
  const [previewText, setPreviewText] = useState('');
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
  const [testOpen, setTestOpen] = useState(false);
  const [testResponse, setTestResponse] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const appliedPrefillKeyRef = useRef<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'general',
      tags: '',
      model: '',
      temperature: 0.7,
      max_tokens: 2048,
      system_prompt: '',
      user_prompt: '',
    },
  });

  const systemPrompt = watch('system_prompt');
  const userPrompt = watch('user_prompt');
  const navigationPrefill = useMemo(
    () => getBuilderNavigationState(location.state),
    [location.state],
  );

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    templatesApi.getById(id).then(({ data, error }) => {
      if (error) {
        toast.error('Failed to load template');
        navigate('/templates');
        return;
      }
      if (data) {
        reset({
          title: data.title,
          description: data.description || '',
          category: data.category,
          tags: (data.tags || []).join(', '),
          model: data.model || '',
          temperature: data.temperature,
          max_tokens: data.max_tokens,
          system_prompt: data.system_prompt || '',
          user_prompt: data.user_prompt,
        });
        setVariables(data.variables || []);
      }
      setLoading(false);
    });
  }, [id, navigate, reset]);

  useEffect(() => {
    if (!isNew || !navigationPrefill || appliedPrefillKeyRef.current === location.key) {
      return;
    }

    const currentValues = getValues();

    reset({
      ...currentValues,
      ...(navigationPrefill.title ? { title: navigationPrefill.title } : {}),
      ...(navigationPrefill.description ? { description: navigationPrefill.description } : {}),
      ...(navigationPrefill.category ? { category: navigationPrefill.category } : {}),
      ...(navigationPrefill.tags ? { tags: navigationPrefill.tags } : {}),
      ...(navigationPrefill.model ? { model: navigationPrefill.model } : {}),
      ...(navigationPrefill.temperature !== undefined
        ? { temperature: navigationPrefill.temperature }
        : {}),
      ...(navigationPrefill.max_tokens !== undefined
        ? { max_tokens: navigationPrefill.max_tokens }
        : {}),
      ...(navigationPrefill.system_prompt
        ? { system_prompt: navigationPrefill.system_prompt }
        : {}),
      ...((navigationPrefill.user_prompt || navigationPrefill.initialPrompt)
        ? { user_prompt: navigationPrefill.user_prompt ?? navigationPrefill.initialPrompt ?? '' }
        : {}),
    });

    if (navigationPrefill.model) {
      selectModel(navigationPrefill.model);
    }

    appliedPrefillKeyRef.current = location.key;
  }, [getValues, isNew, location.key, navigationPrefill, reset, selectModel]);

  const syncVariables = useCallback(
    (text: string) => {
      const names = extractVariables(text);
      setVariables((prev) => {
        const existing = new Map(prev.map((v) => [v.name, v]));
        const merged: PromptVariable[] = [];
        for (const name of names) {
          if (existing.has(name)) {
            merged.push(existing.get(name)!);
          } else {
            merged.push({ name, description: '', defaultValue: '', required: false });
          }
        }
        return merged;
      });
    },
    [],
  );

  const detectSystemVars = useCallback(() => {
    const combined = `${systemPrompt}\n${userPrompt}`;
    syncVariables(combined);
    toast.success(`Variables detected`);
  }, [systemPrompt, userPrompt, syncVariables]);

  const detectUserVars = useCallback(() => {
    syncVariables(userPrompt);
    toast.success(`Variables detected`);
  }, [userPrompt, syncVariables]);

  useEffect(() => {
    if (!systemPrompt && !userPrompt) return;
    const allVars = extractVariables(`${systemPrompt}\n${userPrompt}`);
    setVariables((prev) => {
      const existing = new Map(prev.map((v) => [v.name, v]));
      const merged: PromptVariable[] = [];
      for (const name of allVars) {
        if (existing.has(name)) {
          merged.push(existing.get(name)!);
        } else {
          merged.push({ name, description: '', defaultValue: '', required: false });
        }
      }
      return merged;
    });
  }, [systemPrompt, userPrompt]);

  const addVariable = () => {
    const idx = variables.length + 1;
    setVariables((prev) => [
      ...prev,
      { name: `variable_${idx}`, description: '', defaultValue: '', required: false },
    ]);
  };

  const removeVariable = (index: number) => {
    setVariables((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVariable = (index: number, field: keyof PromptVariable, value: string | boolean) => {
    setVariables((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
    );
  };

  const tagsStr = watch('tags');
  const tagList = tagsStr
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const handleGeneratePreview = () => {
    const missing = getMissingVariables(variables, previewValues);
    if (missing.length > 0) {
      toast.error(`Missing required variables: ${missing.join(', ')}`);
      return;
    }
    const filled = fillVariables(`${systemPrompt}\n\n---\n\n${userPrompt}`, previewValues);
    setPreviewText(filled);
  };

  const handleTest = async () => {
    const missing = getMissingVariables(variables, previewValues);
    if (missing.length > 0) {
      toast.error(`Fill in required variables first: ${missing.join(', ')}`);
      return;
    }
    setTestLoading(true);
    setTestResponse('');
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (systemPrompt.trim()) {
      messages.push({ role: 'system', content: fillVariables(systemPrompt, previewValues) });
    }
    messages.push({ role: 'user', content: fillVariables(userPrompt, previewValues) });

    const model = watch('model');
    const temperature = watch('temperature');
    const maxTokens = watch('max_tokens');

    const { data, error } = await openrouterApi.chatCompletion({
      model: model || selectedModel,
      messages,
      temperature,
      max_tokens: maxTokens,
    });
    if (error) {
      setTestResponse(`Error: ${error.message}`);
      toast.error('Test failed');
    } else if (data) {
      setTestResponse(data.content);
    }
    setTestLoading(false);
  };

  const buildInput = (data: FormData): CreateTemplateInput => ({
    title: data.title,
    description: data.description || '',
    system_prompt: data.system_prompt,
    user_prompt: data.user_prompt,
    category: data.category as PromptCategory,
    variables,
    model: data.model,
    temperature: data.temperature,
    max_tokens: data.max_tokens,
    tags: tagList,
  });

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    const input = buildInput(data);
    let result;
    if (isNew) {
      result = await templatesApi.create(input);
    } else {
      result = await templatesApi.update(id!, input);
    }
    if (result.error) {
      toast.error(`Failed to ${isNew ? 'create' : 'update'} template: ${result.error.message}`);
    } else {
      toast.success(`Template ${isNew ? 'created' : 'updated'}`);
      if (result.data) {
        navigate(`/templates/${result.data.id}`);
      } else {
        navigate('/templates');
      }
    }
    setSaving(false);
  };

  const handleSaveAndTest = async (data: FormData) => {
    setSaving(true);
    const input = buildInput(data);
    let templateId = id;
    if (isNew) {
      const result = await templatesApi.create(input);
      if (result.error) {
        toast.error(`Failed to create template: ${result.error.message}`);
        setSaving(false);
        return;
      }
      templateId = result.data?.id;
      toast.success('Template created');
    } else {
      const result = await templatesApi.update(id!, input);
      if (result.error) {
        toast.error(`Failed to update template: ${result.error.message}`);
        setSaving(false);
        return;
      }
      toast.success('Template updated');
    }
    setSaving(false);
    navigate(`/playground?templateId=${templateId}`);
  };

  const handleCategoryChange = (val: string) => setValue('category', val);

  const handleModelChange = (val: string) => {
    selectModel(val);
    setValue('model', val);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/templates')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isNew ? 'New Template' : 'Edit Template'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {isNew ? 'Create a new prompt template' : 'Modify your prompt template'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Template Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="My awesome prompt template"
                  {...register('title')}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What does this template do?"
                  rows={2}
                  {...register('description')}
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={watch('category')} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  placeholder="tag1, tag2, tag3"
                  {...register('tags')}
                />
                {tagList.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {tagList.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Model</Label>
                <ModelSelector
                  selectedModel={watch('model') || selectedModel}
                  onModelChange={handleModelChange}
                  availableModels={availableModels}
                  isLoading={modelsLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  step={0.1}
                  min={0}
                  max={2}
                  {...register('temperature', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">0 = deterministic, 2 = creative</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_tokens">Max Tokens</Label>
                <Input
                  id="max_tokens"
                  type="number"
                  step={256}
                  min={256}
                  max={8192}
                  {...register('max_tokens', { valueAsNumber: true })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Variables</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addVariable}>
                <Plus className="mr-1 h-3 w-3" />
                Add Variable
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {variables.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No variables detected. Use{' '}
                <code className="bg-muted px-1 rounded">{'{{variable_name}}'}</code>{' '}
                syntax in your prompts.
              </p>
            ) : (
              <ScrollArea className="max-h-[320px]">
                <div className="space-y-3 pr-4">
                  {variables.map((v, i) => (
                    <div
                      key={i}
                      className="grid gap-3 items-start border rounded-lg p-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto]"
                    >
                      <div className="space-y-1">
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={v.name}
                          onChange={(e) => updateVariable(i, 'name', e.target.value)}
                          className="h-8 text-sm font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Input
                          value={v.description}
                          onChange={(e) => updateVariable(i, 'description', e.target.value)}
                          className="h-8 text-sm"
                          placeholder="What this variable is for"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Default</Label>
                        <Input
                          value={v.defaultValue}
                          onChange={(e) => updateVariable(i, 'defaultValue', e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Default value"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-5">
                        <Switch
                          checked={v.required}
                          onCheckedChange={(checked) => updateVariable(i, 'required', checked)}
                        />
                        <Label className="text-xs">Req</Label>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive mt-5"
                        onClick={() => removeVariable(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <PromptEditor
              label="System Prompt"
              value={systemPrompt}
              onChange={(v) => setValue('system_prompt', v)}
              onDetect={detectSystemVars}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">User Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <PromptEditor
              label="User Prompt"
              value={userPrompt}
              onChange={(v) => setValue('user_prompt', v)}
              onDetect={detectUserVars}
            />
            {errors.user_prompt && (
              <p className="text-sm text-destructive mt-1">{errors.user_prompt.message}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {variables.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {variables.map((v) => (
                  <div key={v.name} className="space-y-1">
                    <Label className="text-sm">
                      {v.name}
                      {v.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Input
                      placeholder={v.defaultValue || `Enter ${v.name}`}
                      value={previewValues[v.name] || ''}
                      onChange={(e) =>
                        setPreviewValues((prev) => ({ ...prev, [v.name]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
            <Button type="button" variant="outline" onClick={handleGeneratePreview}>
              <Eye className="mr-2 h-4 w-4" />
              Generate Preview
            </Button>
            {previewText && (
              <div className="rounded-md border bg-muted/30 p-4 whitespace-pre-wrap text-sm">
                {previewText}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={testOpen} onOpenChange={setTestOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline">
                  <Play className="mr-2 h-4 w-4" />
                  Test This Prompt
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Test Prompt</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1">
                  <div className="space-y-4 pr-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Filled Prompts</h4>
                      {systemPrompt.trim() && (
                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground mb-1">System:</p>
                          <pre className="text-xs bg-muted p-3 rounded-md whitespace-pre-wrap max-h-[120px] overflow-auto font-mono">
                            {fillVariables(systemPrompt, previewValues)}
                          </pre>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">User:</p>
                        <pre className="text-xs bg-muted p-3 rounded-md whitespace-pre-wrap max-h-[120px] overflow-auto font-mono">
                          {fillVariables(userPrompt, previewValues)}
                        </pre>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Response</h4>
                      {testLoading ? (
                        <div className="flex items-center gap-2 py-4 text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Generating...
                        </div>
                      ) : testResponse ? (
                        <pre className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap max-h-[300px] overflow-auto font-mono">
                          {testResponse}
                        </pre>
                      ) : (
                        <p className="text-sm text-muted-foreground py-4">
                          Click &quot;Send to OpenRouter&quot; to test.
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      onClick={handleTest}
                      disabled={testLoading}
                    >
                      {testLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="mr-2 h-4 w-4" />
                      )}
                      Send to OpenRouter
                    </Button>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
          <div className="container max-w-5xl flex items-center justify-end gap-3 py-3 px-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/templates')}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={handleSubmit(handleSaveAndTest)}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Save & Test
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isNew ? 'Create' : 'Save'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
