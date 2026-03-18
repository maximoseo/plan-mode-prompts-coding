import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Play, List, Activity, Star, Cpu, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { templatesApi } from '@/lib/api/templates';
import { executionsApi } from '@/lib/api/executions';
import type { PromptTemplate, PromptExecution } from '@/types/prompt';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['all-templates'],
    queryFn: async () => {
      const { data, error } = await templatesApi.list();
      if (error) throw error;
      return (data || []) as PromptTemplate[];
    },
  });

  const { data: executions, isLoading: executionsLoading } = useQuery({
    queryKey: ['recent-executions'],
    queryFn: async () => {
      const { data, error } = await executionsApi.list(10, 0);
      if (error) throw error;
      return (data || []) as PromptExecution[];
    },
  });

  const templateCount = templates?.length ?? 0;
  const executionCount = executions?.length ?? 0;
  const favoriteCount = templates?.filter(t => t.is_favorite).length ?? 0;

  const modelCounts = new Map<string, number>();
  executions?.forEach(e => {
    const count = modelCounts.get(e.model) || 0;
    modelCounts.set(e.model, count + 1);
  });
  const mostUsedModel = modelCounts.size > 0
    ? [...modelCounts.entries()].sort((a, b) => b[1] - a[1])[0]![0]
    : 'N/A';

  const recentTemplates = templates?.slice(0, 5);
  const recentExecutions = executions?.slice(0, 5);

  const statCards = [
    { title: 'Total Templates', value: templateCount, icon: List, loading: templatesLoading },
    { title: 'Total Executions', value: executionCount, icon: Activity, loading: executionsLoading },
    { title: 'Favorites', value: favoriteCount, icon: Star, loading: templatesLoading },
    { title: 'Most Used Model', value: mostUsedModel, icon: Cpu, loading: executionsLoading, isText: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your prompt engineering workspace</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/templates/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
          <Button variant="outline" onClick={() => navigate('/playground')}>
            <Play className="mr-2 h-4 w-4" />
            Open Playground
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {stat.loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold truncate">
                  {stat.isText ? stat.value : (stat.value as number).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Templates</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/templates')}>
              View all
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {templatesLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              : recentTemplates?.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => navigate(`/templates/${t.id}`)}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-accent transition-colors"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {t.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">{t.model}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(t.updated_at), 'MMM d')}
                    </span>
                  </button>
                ))}
            {!templatesLoading && (!recentTemplates || recentTemplates.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No templates yet. Create your first one!
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Executions</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
              View all
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {executionsLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              : recentExecutions?.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 rounded-lg p-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.template_title || 'Untitled'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground truncate">{e.model}</span>
                        <span className="text-xs text-muted-foreground">
                          {e.total_tokens.toLocaleString()} tokens
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {(e.duration_ms / 1000).toFixed(1)}s
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={e.status === 'success' ? 'default' : 'destructive'}
                      className="text-xs shrink-0"
                    >
                      {e.status}
                    </Badge>
                  </div>
                ))}
            {!executionsLoading && (!recentExecutions || recentExecutions.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No executions yet. Try running a prompt!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
