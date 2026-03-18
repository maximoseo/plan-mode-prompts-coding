import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { openrouterApi } from '@/lib/api/openrouter';
import { executionsApi } from '@/lib/api/executions';
import { estimateTokens, formatTokenCount, formatDuration } from '@/lib/prompt-utils';
import { useAuth } from '@/hooks/useAuth';
import { useModelSelection } from '@/hooks/useModelSelection';
import type { ConversationMessage, ChatMessage } from '@/types/prompt';
import { ModelSelector } from '@/components/ModelSelector';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Send, Trash2, Copy, Check, ChevronDown, ChevronUp,
  Loader2, Bot, User, RotateCcw, Sparkles,
} from 'lucide-react';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Playground() {
  const { user } = useAuth();
  const { selectedModel, selectModel, availableModels, isLoading: modelsLoading } = useModelSelection();

  const [systemPrompt, setSystemPrompt] = useState('');
  const [systemPromptOpen, setSystemPromptOpen] = useState(false);

  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastDuration, setLastDuration] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const inputTokens = useMemo(() => {
    const systemPart = systemPrompt ? systemPrompt : '';
    const messagesPart = messages.map(m => m.content).join('');
    return estimateTokens(systemPart + messagesPart);
  }, [systemPrompt, messages]);

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setStreamingContent('');
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isStreaming) return;

    setError(null);
    setLastDuration(null);

    const userMessage: ConversationMessage = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsStreaming(true);
    setStreamingContent('');

    const updatedMessages = [...messages, userMessage];
    const apiMessages: ChatMessage[] = [];
    if (systemPrompt.trim()) {
      apiMessages.push({ role: 'system', content: systemPrompt.trim() });
    }
    for (const m of updatedMessages) {
      apiMessages.push({ role: m.role, content: m.content });
    }

    let fullContent = '';

    await openrouterApi.streamChatCompletion({
      model: selectedModel,
      messages: apiMessages,
      temperature,
      max_tokens: maxTokens,
      onChunk: (chunk) => {
        fullContent += chunk;
        setStreamingContent(fullContent);
      },
      onDone: (content, _usage, durationMs) => {
        const assistantMessage: ConversationMessage = {
          id: generateId(),
          role: 'assistant',
          content: fullContent || content,
          timestamp: Date.now(),
          model: selectedModel,
          tokens: estimateTokens(fullContent || content),
        };

        setMessages(prev => [...prev, assistantMessage]);
        setIsStreaming(false);
        setStreamingContent('');
        setLastDuration(durationMs);

        if (user) {
          executionsApi.create({
            model: selectedModel,
            input_variables: {},
            messages: apiMessages,
            response: fullContent || content,
            prompt_tokens: _usage.prompt_tokens,
            completion_tokens: _usage.completion_tokens,
            total_tokens: _usage.total_tokens,
            duration_ms: durationMs,
            status: 'success',
          }).catch(console.error);
        }

        inputRef.current?.focus();
      },
      onError: (err) => {
        setError(err.message);
        setIsStreaming(false);
        setStreamingContent('');
        inputRef.current?.focus();
      },
    });
  }, [inputValue, isStreaming, messages, systemPrompt, selectedModel, temperature, maxTokens, user]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleClear = useCallback(() => {
    setMessages([]);
    setError(null);
    setStreamingContent('');
    setLastDuration(null);
    setIsStreaming(false);
    inputRef.current?.focus();
  }, []);

  const handleCopy = useCallback(async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      console.error('Failed to copy');
    }
  }, []);

  const handleRegenerate = useCallback(async () => {
    if (isStreaming) return;

    const lastUserIndex = [...messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserIndex === -1) return;

    const actualIndex = messages.length - 1 - lastUserIndex;
    const userMessage = messages[actualIndex];
    if (!userMessage) return;

    setMessages(prev => prev.slice(0, actualIndex));
    setError(null);
    setStreamingContent('');

    setTimeout(() => {
      setInputValue(userMessage.content);
      inputRef.current?.focus();
    }, 0);
  }, [messages, isStreaming]);

  const selectedModelData = availableModels.find(m => m.id === selectedModel);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full" dir="ltr" lang="en">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-semibold">Chat Playground</h1>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs font-mono">
                  ~{formatTokenCount(inputTokens)} tokens
                </Badge>
                {lastDuration !== null && (
                  <Badge variant="outline" className="text-xs">
                    {formatDuration(lastDuration)}
                  </Badge>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRegenerate}
                      disabled={isStreaming || messages.length === 0}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Regenerate last response</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClear}
                      disabled={isStreaming || messages.length === 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear chat</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <ModelSelector
                  selectedModel={selectedModel}
                  onModelChange={selectModel}
                  availableModels={availableModels}
                  isLoading={modelsLoading}
                />
                {selectedModelData && (
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">
                    {selectedModelData.id}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground flex justify-between mb-1">
                    <span>Temperature</span>
                    <span className="font-mono">{temperature.toFixed(1)}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={e => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-1.5 accent-primary cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground flex justify-between mb-1">
                    <span>Max Tokens</span>
                    <span className="font-mono">{formatTokenCount(maxTokens)}</span>
                  </label>
                  <input
                    type="range"
                    min="256"
                    max="8192"
                    step="256"
                    value={maxTokens}
                    onChange={e => setMaxTokens(parseInt(e.target.value))}
                    className="w-full h-1.5 accent-primary cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={() => setSystemPromptOpen(prev => !prev)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {systemPromptOpen ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                <span>System Prompt</span>
                {systemPrompt.trim() && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                    set
                  </Badge>
                )}
              </button>
              {systemPromptOpen && (
                <Textarea
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  placeholder="Enter a system prompt to set the behavior of the AI assistant..."
                  className="mt-2 min-h-[80px] text-sm resize-y"
                  disabled={isStreaming}
                />
              )}
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="max-w-4xl mx-auto px-4 py-4">
            {messages.length === 0 && !isStreaming && (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                <Bot className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h2 className="text-lg font-medium text-muted-foreground mb-1">Start a conversation</h2>
                <p className="text-sm text-muted-foreground/70 max-w-md">
                  Select a model, adjust parameters, and begin chatting to test your prompts with different AI models.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex gap-2 max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <User className="h-3.5 w-3.5" />
                      ) : (
                        <Bot className="h-3.5 w-3.5" />
                      )}
                    </div>

                    <div className="flex flex-col gap-1 min-w-0">
                      <Card
                        className={`px-3 py-2 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="text-sm whitespace-pre-wrap break-words">
                          {msg.role === 'assistant' ? (
                            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                              {msg.content}
                            </ReactMarkdown>
                          ) : (
                            msg.content
                          )}
                        </div>
                      </Card>

                      <div className={`flex items-center gap-1 text-[10px] text-muted-foreground ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <span>{formatTimestamp(msg.timestamp)}</span>
                        {msg.model && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                            {msg.model.split('/').pop()}
                          </Badge>
                        )}
                        {msg.tokens !== undefined && (
                          <span className="font-mono">{formatTokenCount(msg.tokens)} tok</span>
                        )}
                        {msg.role === 'assistant' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4"
                                onClick={() => handleCopy(msg.content, msg.id)}
                              >
                                {copiedId === msg.id ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {copiedId === msg.id ? 'Copied' : 'Copy response'}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {isStreaming && streamingContent && (
                <div className="flex justify-start">
                  <div className="flex gap-2 max-w-[85%] sm:max-w-[75%]">
                    <div className="flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <Card className="px-3 py-2 bg-muted">
                        <div className="text-sm whitespace-pre-wrap break-words">
                          <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                            {streamingContent}
                          </ReactMarkdown>
                        </div>
                        <span className="inline-block w-1.5 h-4 bg-foreground/70 animate-pulse ml-0.5 align-middle" />
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {isStreaming && !streamingContent && (
                <div className="flex justify-start">
                  <div className="flex gap-2">
                    <div className="flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                    <Card className="px-4 py-3 bg-muted">
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span className="text-sm text-muted-foreground">Thinking</span>
                        <span className="flex gap-0.5">
                          <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <Card className="mt-4 px-4 py-3 border-destructive/50 bg-destructive/5">
                <p className="text-sm text-destructive">{error}</p>
              </Card>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t bg-background px-4 py-3">
          <div className="max-w-4xl mx-auto flex gap-2">
            <Textarea
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
              className="min-h-[44px] max-h-[200px] resize-none text-sm flex-1"
              rows={1}
              disabled={isStreaming}
            />
            {isStreaming ? (
              <Button
                variant="outline"
                size="icon"
                onClick={handleStop}
                className="flex-shrink-0"
              >
                <div className="h-3 w-3 rounded-sm bg-destructive" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
