-- Prompt Templates
CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL DEFAULT '',
  user_prompt TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('seo', 'content', 'technical', 'social', 'automation', 'general')),
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  model TEXT NOT NULL DEFAULT 'openai/gpt-4o-mini',
  temperature NUMERIC(3,2) NOT NULL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER NOT NULL DEFAULT 2048 CHECK (max_tokens > 0),
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prompt Execution History
CREATE TABLE IF NOT EXISTS prompt_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES prompt_templates(id) ON DELETE SET NULL,
  template_title TEXT,
  model TEXT NOT NULL,
  input_variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  response TEXT,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prompt_templates_user_id ON prompt_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_favorite ON prompt_templates(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_prompt_executions_user_id ON prompt_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_executions_template_id ON prompt_executions(template_id);
CREATE INDEX IF NOT EXISTS idx_prompt_executions_created_at ON prompt_executions(created_at DESC);

-- Row Level Security
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prompt_templates
CREATE POLICY "Users can view own templates" ON prompt_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates" ON prompt_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON prompt_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON prompt_templates
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for prompt_executions
CREATE POLICY "Users can view own executions" ON prompt_executions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own executions" ON prompt_executions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own executions" ON prompt_executions
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prompt_templates_updated_at
  BEFORE UPDATE ON prompt_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Websites / Projects
CREATE TABLE IF NOT EXISTS websites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT,
  description TEXT,
  icon TEXT DEFAULT '🌐',
  color TEXT DEFAULT '#8b5cf6',
  prompt_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_websites_user_id ON websites(user_id);
CREATE INDEX IF NOT EXISTS idx_websites_pinned ON websites(user_id, is_pinned);

ALTER TABLE websites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own websites" ON websites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own websites" ON websites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own websites" ON websites FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own websites" ON websites FOR DELETE USING (auth.uid() = user_id);

-- Add website_id to prompt_templates
ALTER TABLE prompt_templates ADD COLUMN IF NOT EXISTS website_id UUID REFERENCES websites(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_prompt_templates_website_id ON prompt_templates(website_id);

-- Add improvement_mode to prompt_templates
ALTER TABLE prompt_templates ADD COLUMN IF NOT EXISTS improvement_mode TEXT;
ALTER TABLE prompt_templates ADD COLUMN IF NOT EXISTS original_prompt TEXT;

-- Prompt Improvements (results from improvement/swarm runs)
CREATE TABLE IF NOT EXISTS prompt_improvements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES prompt_templates(id) ON DELETE SET NULL,
  website_id UUID REFERENCES websites(id) ON DELETE SET NULL,
  original_prompt TEXT NOT NULL,
  improved_prompt TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'general',
  is_swarm BOOLEAN NOT NULL DEFAULT false,
  swarm_models TEXT[],
  swarm_roles TEXT[],
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_improvements_user_id ON prompt_improvements(user_id);
CREATE INDEX IF NOT EXISTS idx_improvements_website_id ON prompt_improvements(website_id);

ALTER TABLE prompt_improvements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own improvements" ON prompt_improvements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own improvements" ON prompt_improvements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own improvements" ON prompt_improvements FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER websites_updated_at
  BEFORE UPDATE ON websites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
