import { useState, useEffect, useCallback } from 'react';
import { executionsApi } from '@/lib/api/executions';
import type { PromptExecution } from '@/types/prompt';
import { formatTokenCount, formatDuration } from '@/lib/prompt-utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Trash2,
  Search,
  Clock,
  Coins,
  Zap,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  History as HistoryIcon,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

type StatusFilter = 'all' | 'success' | 'error';

const PAGE_SIZE = 20;

export default function HistoryPage() {
  const [executions, setExecutions] = useState<PromptExecution[]>([]);
  const [filteredExecutions, setFilteredExecutions] = useState<PromptExecution[]>(
    []
  );
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadExecutions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await executionsApi.list();
      setExecutions(data ?? []);
      setFilteredExecutions(data ?? []);
    } catch {
      toast({
        title: 'Failed to load executions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadExecutions();
  }, [loadExecutions]);

  useEffect(() => {
    let result = executions;

    if (statusFilter !== 'all') {
      result = result.filter(
        (e) => e.status === (statusFilter === 'success' ? 'success' : 'error')
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((e) =>
        e.template_title.toLowerCase().includes(query)
      );
    }

    setFilteredExecutions(result);
    setVisibleCount(PAGE_SIZE);
  }, [executions, statusFilter, searchQuery]);

  const handleClearAll = async () => {
    try {
      await executionsApi.clearAll();
      setExecutions([]);
      setFilteredExecutions([]);
      setVisibleCount(PAGE_SIZE);
      toast({ title: 'All history cleared' });
    } catch {
      toast({
        title: 'Failed to clear history',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await executionsApi.delete(id);
      setExecutions((prev) => prev.filter((e) => e.id !== id));
      setExpandedId(null);
      toast({ title: 'Execution deleted' });
    } catch {
      toast({
        title: 'Failed to delete execution',
        variant: 'destructive',
      });
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const totalExecutions = filteredExecutions.length;
  const totalTokens = filteredExecutions.reduce(
    (sum, e) => sum + (e.total_tokens ?? 0),
    0
  );
  const avgDuration =
    filteredExecutions.length > 0
      ? filteredExecutions.reduce((sum, e) => sum + (e.duration_ms ?? 0), 0) /
        filteredExecutions.length
      : 0;
  const successCount = filteredExecutions.filter(
    (e) => e.status === 'success'
  ).length;
  const successRate =
    filteredExecutions.length > 0
      ? (successCount / filteredExecutions.length) * 100
      : 0;

  const visibleExecutions = filteredExecutions.slice(0, visibleCount);
  const hasMore = visibleCount < filteredExecutions.length;

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HistoryIcon className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight">Execution History</h1>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={executions.length === 0}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All History
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear all execution history?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all {executions.length} execution
                records. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearAll}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Executions</p>
              <p className="text-xl font-semibold">{totalExecutions}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Tokens</p>
              <p className="text-xl font-semibold">{formatTokenCount(totalTokens)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg. Response</p>
              <p className="text-xl font-semibold">{formatDuration(avgDuration)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-xl font-semibold">{successRate.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Successful</p>
              <p className="text-xl font-semibold">
                {successCount}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  / {totalExecutions}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by template title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(val) => setStatusFilter(val as StatusFilter)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredExecutions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-16 text-center">
          <HistoryIcon className="mb-4 h-16 w-16 text-muted-foreground/40" />
          <h3 className="mb-1 text-lg font-semibold">No executions yet</h3>
          <p className="text-sm text-muted-foreground">
            {executions.length > 0
              ? 'No executions match the current filters.'
              : 'Execute a prompt to see it appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleExecutions.map((execution) => {
            const isExpanded = expandedId === execution.id;
            const isSuccess = execution.status === 'success';

            return (
              <Card key={execution.id} className="overflow-hidden transition-colors hover:bg-muted/50">
                <CardContent className="p-0">
                  <button
                    onClick={() => toggleExpand(execution.id)}
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <div className="flex flex-1 flex-wrap items-center gap-3">
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {execution.template_title}
                      </span>

                      <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                        {execution.model}
                      </Badge>

                      <Badge
                        variant={isSuccess ? 'default' : 'destructive'}
                        className="shrink-0 gap-1"
                      >
                        {isSuccess ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {isSuccess ? 'Success' : 'Error'}
                      </Badge>

                      <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                        {formatTokenCount(execution.prompt_tokens)} in /{' '}
                        {formatTokenCount(execution.completion_tokens)} out
                      </span>

                      <span className="hidden shrink-0 text-xs font-medium text-muted-foreground sm:inline">
                        {formatTokenCount(execution.total_tokens)} tokens
                      </span>

                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDuration(execution.duration_ms)}
                      </span>

                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(execution.created_at).toLocaleString()}
                      </span>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>

                  {isExpanded && (
                    <>
                      <Separator />
                      <div className="p-4 space-y-4">
                        {execution.input_variables &&
                          Object.keys(execution.input_variables).length > 0 && (
                            <div>
                              <h4 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                Input Variables
                              </h4>
                              <div className="rounded-md bg-muted p-3">
                                <pre className="whitespace-pre-wrap break-words text-sm">
                                  {JSON.stringify(execution.input_variables, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}

                        {execution.messages && execution.messages.length > 0 && (
                          <div>
                            <h4 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                              Messages
                            </h4>
                            <ScrollArea className="max-h-60 rounded-md border">
                              <div className="p-3 space-y-2">
                                {execution.messages.map((msg, idx) => (
                                  <div
                                    key={idx}
                                    className="rounded-md bg-muted p-3"
                                  >
                                    <Badge
                                      variant="outline"
                                      className="mb-1 text-xs"
                                    >
                                      {msg.role}
                                    </Badge>
                                    <pre className="whitespace-pre-wrap break-words text-sm">
                                      {typeof msg.content === 'string'
                                        ? msg.content
                                        : JSON.stringify(msg.content, null, 2)}
                                    </pre>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}

                        <div>
                          <h4 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            {isSuccess ? 'Response' : 'Error'}
                          </h4>
                          <div
                            className={`rounded-md p-3 ${
                              isSuccess ? 'bg-muted' : 'bg-destructive/10 border border-destructive/20'
                            }`}
                          >
                            {isSuccess ? (
                              <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap break-words text-sm">
                                {execution.response}
                              </div>
                            ) : (
                              <p className="text-sm text-destructive whitespace-pre-wrap">
                                {execution.error_message ?? 'An unknown error occurred.'}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Execution
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this execution?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove the execution
                                  record for &quot;{execution.template_title}&quot;.
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(execution.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              >
                <Loader2 className="mr-2 h-4 w-4" />
                Load More ({filteredExecutions.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
