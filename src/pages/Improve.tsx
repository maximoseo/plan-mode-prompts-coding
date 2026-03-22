import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, Copy, Save, RefreshCw, Check, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectSeparator } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { improvePrompt } from '@/lib/improvement/engine';
import { improvementsApi } from '@/lib/api/improvements';
import { IMPROVEMENT_PRESETS, PRESET_CATEGORIES } from '@/lib/improvement/presets';
import { getPromptFlowNavigationState } from '@/lib/navigation-state';
import { useModelSelection } from '@/hooks/useModelSelection';
import { estimateTokens, formatTokenCount, formatDuration } from '@/lib/prompt-utils';
import { toast } from 'sonner';
import type { ImprovementMode } from '@/types/prompt';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

export default function Improve() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedModel, selectModel, availableModels } = useModelSelection();

  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<ImprovementMode>('general');
  const [result, setResult] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [resultTokens, setResultTokens] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [sourceTitle, setSourceTitle] = useState<string | null>(null);
  const appliedPrefillKeyRef = useRef<string | null>(null);

  const navigationPrefill = useMemo(
    () => getPromptFlowNavigationState(location.state),
    [location.state],
  );

  useEffect(() => {
    if (!navigationPrefill || appliedPrefillKeyRef.current === location.key) {
      return;
    }

    if (navigationPrefill.initialPrompt) {
      setPrompt(navigationPrefill.initialPrompt);
    }

    if (navigationPrefill.mode) {
      setMode(navigationPrefill.mode);
    }

    if (navigationPrefill.model) {
      selectModel(navigationPrefill.model);
    }

    setSourceTitle(navigationPrefill.title ?? null);
    appliedPrefillKeyRef.current = location.key;
  }, [location.key, navigationPrefill, selectModel]);

  const improveMutation = useMutation({
    mutationFn: async () => {
      const res = await improvePrompt(prompt, mode, selectedModel);
      return res;
    },
    onSuccess: (res) => {
      setResult(res.improved);
      setDuration(res.durationMs);
      setResultTokens(res.totalTokens);
      improvementsApi.create({
        original_prompt: res.original,
        improved_prompt: res.improved,
        mode: res.mode,
        model: res.model,
        is_swarm: false,
        prompt_tokens: res.promptTokens,
        completion_tokens: res.completionTokens,
        total_tokens: res.totalTokens,
        duration_ms: res.durationMs,
      }).catch(() => {});
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to improve prompt');
    },
  });

  const inputTokens = estimateTokens(prompt);
  const charCount = prompt.length;
  const activePreset = IMPROVEMENT_PRESETS.find(p => p.id === mode);
  const saveTitle = sourceTitle ? `Improved: ${sourceTitle}` : `Improved: ${mode}`;

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }

  function handleSaveAsTemplate() {
    if (!result) return;
    navigate('/templates/new', {
        state: {
          title: saveTitle,
          description: `Prompt improved using ${activePreset?.label || mode} mode`,
          user_prompt: result,
          model: selectedModel,
      },
    });
  }

  function handleReRun() {
    setResult(null);
    setDuration(0);
    setResultTokens(0);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">Prompt Improvement</h2>
          </div>
          <p className="text-muted-foreground">Paste a prompt and let AI make it better</p>
          {sourceTitle && (
            <p className="text-xs text-muted-foreground mt-2">Starting from: {sourceTitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs font-mono">
            {availableModels.find(m => m.id === selectedModel)?.name || selectedModel}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Paste your prompt here..."
                className="min-h-[300px] text-sm resize-y"
                disabled={improveMutation.isPending}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{charCount.toLocaleString()} chars</span>
                <span>~{formatTokenCount(inputTokens)} tokens</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Mode</label>
                <Select value={mode} onValueChange={v => setMode(v as ImprovementMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_CATEGORIES.map((cat, catIndex) => (
                      <Fragment key={cat}>
                        {catIndex > 0 && <SelectSeparator />}
                        <SelectGroup>
                          <SelectLabel>{cat}</SelectLabel>
                          {IMPROVEMENT_PRESETS.filter(p => p.category === cat).map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              <span className="mr-2">{p.icon}</span>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </Fragment>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Model</label>
                <Select value={selectedModel} onValueChange={selectModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="mr-2">{m.name}</span>
                        <span className="text-xs text-muted-foreground">({m.provider})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {activePreset && (
                <p className="text-xs text-muted-foreground">{activePreset.description}</p>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={() => improveMutation.mutate()}
                disabled={!prompt.trim() || improveMutation.isPending}
              >
                {improveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Improving
                    <span className="flex gap-0.5 ml-2">
                      <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Improve Prompt
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="min-h-[300px]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Improved Prompt</CardTitle>
              {result && (
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs mr-2">
                    ~{formatTokenCount(resultTokens)} tokens
                  </Badge>
                  <Badge variant="outline" className="text-xs mr-2">
                    {formatDuration(duration)}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSaveAsTemplate}>
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleReRun}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {improveMutation.isPending ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing and improving your prompt</span>
                    <span className="flex gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : result ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                    {result}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Sparkles className="h-10 w-10 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Paste a prompt on the left and click &quot;Improve Prompt&quot; to see the result here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {result && prompt && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-muted-foreground">Original vs Improved</CardTitle>
              </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">Before ({formatTokenCount(inputTokens)} tokens)</div>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-32 whitespace-pre-wrap break-words">
                {prompt}
              </pre>
              <div className="text-xs font-medium text-muted-foreground mb-1">After (~{formatTokenCount(resultTokens)} tokens)</div>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-32 whitespace-pre-wrap break-words">
                {result}
              </pre>
            </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
