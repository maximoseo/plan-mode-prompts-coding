import { Fragment, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  Sparkles, Copy, Save, Loader2, ArrowRight, ChevronDown, ChevronUp,
  Check, AlertCircle, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectSeparator } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { runSwarm, type SwarmAgentStatus } from '@/lib/improvement/engine';
import { IMPROVEMENT_PRESETS, PRESET_CATEGORIES, SWARM_MODELS } from '@/lib/improvement/presets';
import { improvementsApi } from '@/lib/api/improvements';
import { getPromptFlowNavigationState } from '@/lib/navigation-state';
import { estimateTokens, formatTokenCount, formatDuration } from '@/lib/prompt-utils';
import { toast } from 'sonner';
import type { ImprovementMode } from '@/types/prompt';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

export default function Swarm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<ImprovementMode>('general');
  const [agents, setAgents] = useState<SwarmAgentStatus[]>([]);
  const [synthesized, setSynthesized] = useState<string | null>(null);
  const [totalDuration, setTotalDuration] = useState(0);
  const [copied, setCopied] = useState(false);
  const [expandedAgents, setExpandedAgents] = useState<Set<number>>(new Set());
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

    setSourceTitle(navigationPrefill.title ?? null);
    appliedPrefillKeyRef.current = location.key;
  }, [location.key, navigationPrefill]);

  const inputTokens = estimateTokens(prompt);
  const isRunning = agents.some(a => a.status === 'running');
  const saveTitle = sourceTitle ? `Swarm: ${sourceTitle}` : `Swarm: ${mode}`;

  const handleAgentUpdate = useCallback((agent: SwarmAgentStatus) => {
    setAgents(prev => {
      const next = [...prev];
      next[agent.index] = agent;
      return next;
    });
  }, []);

  const swarmMutation = useMutation({
    mutationFn: async () => {
      setAgents(SWARM_MODELS.map((m, i) => ({
        index: i,
        model: m.id,
        name: m.name,
        role: m.role,
        status: 'pending' as const,
        response: '',
        durationMs: 0,
      })));
      setSynthesized(null);
      setTotalDuration(0);

      const result = await runSwarm(prompt, mode, handleAgentUpdate);
      return result;
    },
    onSuccess: (result) => {
      setSynthesized(result.synthesized);
      setTotalDuration(result.totalDurationMs);
      improvementsApi.create({
        original_prompt: prompt,
        improved_prompt: result.synthesized,
        mode,
        model: 'swarm',
        is_swarm: true,
        swarm_models: SWARM_MODELS.map(m => m.id),
        swarm_roles: SWARM_MODELS.map(m => m.role),
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        duration_ms: result.totalDurationMs,
      }).catch(console.error);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Swarm failed');
    },
  });

  async function handleCopy() {
    if (!synthesized) return;
    try {
      await navigator.clipboard.writeText(synthesized);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }

  function handleSaveAsTemplate() {
    if (!synthesized) return;
    navigate('/templates/new', {
        state: {
          title: saveTitle,
          description: `Prompt improved by 3 AI agents using ${IMPROVEMENT_PRESETS.find(p => p.id === mode)?.label || mode} mode`,
          user_prompt: synthesized,
          model: 'anthropic/claude-sonnet-4',
      },
    });
  }

  function toggleAgent(index: number) {
    setExpandedAgents(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">Swarm Agents</h2>
          </div>
          <p className="text-muted-foreground">3 AI models working together from different angles</p>
          {sourceTitle && (
            <p className="text-xs text-muted-foreground mt-2">Starting from: {sourceTitle}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {SWARM_MODELS.map((agent) => (
          <Card key={agent.id} className="relative overflow-hidden">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-xs">{agent.provider}</Badge>
              </div>
              <p className="font-medium text-sm">{agent.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{agent.roleDescription}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Paste your prompt here for the swarm to improve..."
                className="min-h-[300px] text-sm resize-y"
                disabled={isRunning}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{prompt.length.toLocaleString()} chars</span>
                <span>~{formatTokenCount(inputTokens)} tokens</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Mode</label>
                <Select value={mode} onValueChange={v => setMode(v as ImprovementMode)} disabled={isRunning}>
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

              <Button
                className="w-full"
                size="lg"
                onClick={() => swarmMutation.mutate()}
                disabled={!prompt.trim() || isRunning}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Swarm
                    <span className="flex gap-0.5 ml-2">
                      <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Run Swarm
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {agents.length > 0 && (
            <div className="space-y-3">
              {agents.map((agent) => {
                const isExpanded = expandedAgents.has(agent.index);
                return (
                  <Card key={agent.index} className="overflow-hidden">
                    <button
                      className="w-full text-left"
                      onClick={() => toggleAgent(agent.index)}
                      disabled={agent.status === 'pending' || agent.status === 'running'}
                    >
                      <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                            agent.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                            agent.status === 'error' ? 'bg-red-500/10 text-red-500' :
                            agent.status === 'running' ? 'bg-primary/10 text-primary' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {agent.status === 'completed' ? <Check className="h-4 w-4" /> :
                             agent.status === 'error' ? <AlertCircle className="h-4 w-4" /> :
                             agent.status === 'running' ? <Loader2 className="h-4 w-4 animate-spin" /> :
                             <div className="h-2 w-2 rounded-full bg-muted-foreground" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{agent.role}</p>
                            <p className="text-xs text-muted-foreground">{agent.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {agent.status === 'completed' && (
                            <Badge variant="outline" className="text-xs">{formatDuration(agent.durationMs)}</Badge>
                          )}
                          {agent.status === 'error' && (
                            <Badge variant="destructive" className="text-xs">Error</Badge>
                          )}
                          {agent.status === 'running' && (
                            <Badge className="text-xs">Running</Badge>
                          )}
                          {(agent.status === 'completed' || agent.status === 'error') && (
                            isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </CardHeader>
                    </button>
                    {isExpanded && (agent.status === 'completed' || agent.status === 'error') && (
                      <CardContent className="pt-0 px-4 pb-4">
                        {agent.status === 'error' ? (
                          <p className="text-sm text-destructive">{agent.error}</p>
                        ) : (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                              {agent.response}
                            </ReactMarkdown>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {synthesized && (
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Best Result</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs mr-1">{formatDuration(totalDuration)}</Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSaveAsTemplate}>
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                    {synthesized}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {!synthesized && agents.length === 0 && (
            <Card className="min-h-[300px]">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Zap className="h-10 w-10 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Paste a prompt and run the swarm to see 3 AI models improve it simultaneously
                </p>
              </CardContent>
            </Card>
          )}

          {isRunning && !synthesized && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Synthesizing best result from agent responses</span>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
