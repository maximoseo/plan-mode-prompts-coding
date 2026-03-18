# Prompt Engineering Studio

A full-featured AI prompt engineering tool for building, testing, and managing prompts. Built with React, TypeScript, and Tailwind CSS, powered by Supabase for auth/storage and OpenRouter for AI model access.

## Features

- **Template Builder** - Create and edit prompt templates with variable support (`{{variable}}` syntax)
- **Chat Playground** - Real-time streaming conversations with any OpenRouter model
- **Execution History** - Track all prompt runs with token usage and performance metrics
- **Model Selection** - Access 100+ AI models through OpenRouter
- **Variable System** - Define reusable template variables with defaults and validation

## Getting Started

```bash
npm install
cp .env.example .env
# Fill in your Supabase and OpenRouter credentials
npm run dev
```

## Database Setup

Run `supabase/schema.sql` in your Supabase project's SQL Editor to create the required tables, indexes, and RLS policies.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `VITE_OPENROUTER_API_KEY` | OpenRouter API key |

## Tech Stack

- React 18 + TypeScript
- Vite + SWC
- Tailwind CSS + shadcn/ui
- Supabase (Auth + Database)
- OpenRouter API
- React Router v6
- TanStack Query
