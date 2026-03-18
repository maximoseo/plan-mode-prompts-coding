import type { PromptVariable } from '@/types/prompt';

export function extractVariables(template: string): string[] {
  const regex = /\{\{(\w+)}}/g;
  const variables: string[] = [];
  let match;
  while ((match = regex.exec(template)) !== null) {
    if (match[1] !== undefined && !variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  return variables;
}

export function fillVariables(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)}}/g, (_, key) => {
    return values[key] || `{{${key}}}`;
  });
}

export function getMissingVariables(variables: PromptVariable[], values: Record<string, string>): string[] {
  const missing: string[] = [];
  for (const v of variables) {
    if (v.required) {
      const val = values[v.name];
      if (!val || val.trim() === '') {
        missing.push(v.name);
      }
    }
  }
  return missing;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function formatTokenCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}
