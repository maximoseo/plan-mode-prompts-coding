import { useState } from 'react';
import { Check, ChevronDown, Search, Star, Zap, Brain, Code, Crown, Globe, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CATEGORIES, type ModelInfo } from '@/lib/models/catalog';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  availableModels: ModelInfo[];
  isLoading?: boolean;
  compact?: boolean;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  star: <Star className="h-3.5 w-3.5" />,
  brain: <Brain className="h-3.5 w-3.5" />,
  code: <Code className="h-3.5 w-3.5" />,
  zap: <Zap className="h-3.5 w-3.5" />,
  crown: <Crown className="h-3.5 w-3.5" />,
  globe: <Globe className="h-3.5 w-3.5" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  recommended: 'text-amber-500 dark:text-amber-400',
  reasoning: 'text-violet-500 dark:text-violet-400',
  coding: 'text-emerald-500 dark:text-emerald-400',
  fast: 'text-sky-500 dark:text-sky-400',
  premium: 'text-orange-500 dark:text-orange-400',
  open: 'text-teal-500 dark:text-teal-400',
};

const PROVIDER_COLORS: Record<string, string> = {
  OpenAI: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  Anthropic: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  Google: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  DeepSeek: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  Meta: 'bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300',
  Qwen: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  Mistral: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  'Zhipu AI': 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  Moonshot: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
  MiniMax: 'bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-300',
};

function getModelData(modelId: string, models: ModelInfo[]): ModelInfo | undefined {
  return models.find(m => m.id === modelId);
}

export function ModelSelector({ selectedModel, onModelChange, availableModels, isLoading, compact }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const current = getModelData(selectedModel, availableModels);
  const searchLower = search.toLowerCase();

  const filteredModels = searchLower
    ? availableModels.filter(m =>
        m.name.toLowerCase().includes(searchLower) ||
        m.provider.toLowerCase().includes(searchLower) ||
        m.id.toLowerCase().includes(searchLower) ||
        m.description.toLowerCase().includes(searchLower)
      )
    : availableModels;

  const grouped: { category: typeof CATEGORIES[number]; models: ModelInfo[] }[] = CATEGORIES
    .map(cat => ({
      category: cat,
      models: filteredModels.filter(m => m.category === cat.key),
    }))
    .filter(g => g.models.length > 0);

  const triggerLabel = compact
    ? current?.name.split(' ').slice(0, 2).join(' ') ?? 'Select Model'
    : current?.name ?? 'Select Model';

  const triggerSublabel = compact
    ? current?.provider ?? ''
    : '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-9 gap-1.5 font-normal',
            compact ? 'px-2.5 text-xs' : 'px-3 text-sm',
            selectedModel && 'ring-1 ring-purple-500/50 dark:ring-purple-400/50'
          )}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <span className="truncate font-medium">{triggerLabel}</span>
              {triggerSublabel && (
                <span className="text-muted-foreground truncate hidden sm:inline">
                  · {triggerSublabel}
                </span>
              )}
            </>
          )}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="flex items-center border-b px-3 py-2">
          <Search className="h-3.5 w-3.5 mr-2 shrink-0 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search models..."
            className="h-7 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 text-sm"
          />
        </div>
        <ScrollArea className="max-h-[340px]">
          <div className="py-1">
            {grouped.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No models found
              </div>
            )}
            {grouped.map(({ category, models }) => (
              <div key={category.key}>
                <div className="flex items-center gap-1.5 px-3 py-1.5">
                  <span className={CATEGORY_COLORS[category.key]}>
                    {CATEGORY_ICONS[category.icon]}
                  </span>
                  <span className={cn('text-xs font-semibold uppercase tracking-wider', CATEGORY_COLORS[category.key])}>
                    {category.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{models.length}</span>
                </div>
                {models.map(model => {
                  const isSelected = model.id === selectedModel;
                  const isRecommended = model.category === 'recommended';
                  return (
                    <button
                      key={model.id}
                      type="button"
                      className={cn(
                        'flex items-start gap-2 w-full px-3 py-2 text-left hover:bg-accent/50 transition-colors',
                        isSelected && 'bg-purple-50 dark:bg-purple-950/30'
                      )}
                      onClick={() => {
                        onModelChange(model.id);
                        setOpen(false);
                        setSearch('');
                      }}
                    >
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0 mt-0.5" />
                          <span className={cn(
                            'text-sm font-medium truncate',
                            isSelected && 'text-purple-700 dark:text-purple-300'
                          )}>
                            {model.name}
                          </span>
                          {isRecommended && (
                            <Star className="h-3 w-3 text-amber-500 shrink-0 fill-amber-500" />
                          )}
                          {isSelected && (
                            <Check className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0 ml-auto" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 pl-3.5">
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-[10px] px-1.5 py-0 h-4 font-medium border-0',
                              PROVIDER_COLORS[model.provider] ?? 'bg-muted text-muted-foreground'
                            )}
                          >
                            {model.provider}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground truncate">
                            {model.description}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
