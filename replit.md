# AI Monorepo

## Overview

OpenAI-compatible AI proxy service that routes requests to Anthropic (Claude), OpenAI (GPT/o-series), Gemini, and OpenRouter based on model name — no client-side changes required. Ships with a React dark-theme admin portal featuring a setup wizard, version panel, and one-click auto-update.

Cloned from: https://github.com/ldsxnet/rep

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/api-portal run dev` — run admin portal locally

## Architecture

- `artifacts/api-server/` — Express backend, OpenAI-compatible proxy routes at `/api/v1/*`
- `artifacts/api-portal/` — React admin portal served at `/`
- `fleet-admin/` — Static HTML fleet manager for managing multiple proxy nodes
- `lib/` — Shared TypeScript libraries (db, api-client-react, api-zod, api-spec)
- `scripts/` — Utility scripts including setup-integrations.mjs

## Features

- Dual-provider routing: `claude-*` → Anthropic, others → OpenAI
- Full tool/function calling (streaming & non-streaming)
- Vision support (image URL auto-prefetch to base64)
- Claude thinking mode (append `-thinking` or `-thinking-visible` to model name)
- Flexible auth: Bearer token, `x-goog-api-key` header, or `?key=` query param
- Version-aware response headers
- Fleet Manager HTML dashboard

## Environment Variables

- `PROXY_API_KEY` — Access key for the proxy (set via setup wizard)
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` / `_BASE_URL` — Anthropic via Replit AI Integrations
- `AI_INTEGRATIONS_OPENAI_API_KEY` / `_BASE_URL` — OpenAI via Replit AI Integrations
- `AI_INTEGRATIONS_GEMINI_API_KEY` / `_BASE_URL` — Gemini via Replit AI Integrations
- `AI_INTEGRATIONS_OPENROUTER_API_KEY` / `_BASE_URL` — OpenRouter via Replit AI Integrations

## Setup

1. All 4 AI integrations are pre-configured via Replit AI Integrations (no personal API keys needed)
2. Visit the admin portal and click "开始配置" to set your `PROXY_API_KEY`
3. Use the proxy at `/api/v1/chat/completions` with your chosen key
