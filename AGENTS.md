# Spiral v2

AI-powered writing assistant with multi-agent architecture. Helps users create blog posts, tweets, emails, and essays through an Orchestrator → Writer handoff system.

## Core Commands

```bash
# Development
pnpm dev              # Start Next.js dev server + Convex
pnpm build            # Production build

# Validation (run before commits)
pnpm check            # TypeScript + ESLint + Tests
pnpm check:fix        # TypeScript + ESLint + Prettier auto-fix
pnpm typecheck        # TypeScript only
pnpm lint             # ESLint only
pnpm lint:fix         # ESLint with auto-fix
pnpm test             # Run unit tests
pnpm test:watch       # Run tests in watch mode
pnpm format           # Format all files with Prettier
pnpm format:check     # Check formatting without writing
```

## Project Layout

```
├── app/                    # Next.js App Router
│   ├── api/chat/           # AI chat endpoint (streaming)
│   ├── chat/               # Main chat page
│   └── layout.tsx          # Root layout with Convex provider
├── components/
│   ├── spiral/             # Spiral-specific components
│   │   ├── chat-interface  # Main chat UI
│   │   ├── draft-panel     # Side-by-side draft comparison
│   │   ├── sidebar         # Collapsible navigation
│   │   ├── thinking-block  # Extended thinking display
│   │   └── tool-indicator  # Tool usage badges
│   └── ui/                 # Reusable UI primitives (shadcn)
├── convex/                 # Convex backend
│   ├── schema.ts           # Database schema
│   ├── sessions.ts         # Session mutations/queries
│   ├── messages.ts         # Message persistence
│   └── drafts.ts           # Draft management
├── lib/
│   ├── prompts/            # Agent system prompts
│   │   ├── orchestrator.ts # Routes requests, does research
│   │   └── writer.ts       # Generates 3 draft variations
│   ├── parse-drafts.ts     # Extract drafts from AI output
│   └── utils.ts            # Utilities (cn, etc.)
└── docs/spiral-prompts/    # Prompt documentation
```

## Development Patterns

### Code Style
- TypeScript strict mode, no `any` without eslint-disable comment
- Tailwind CSS for styling, dark theme (#1a1a1a background)
- Orange (#f97316) as accent color
- Components use `"use client"` directive when needed

### Naming Conventions
- **Components**: PascalCase (`ChatInterface.tsx`, `DraftPanel.tsx`)
- **Functions/Variables**: camelCase (`handleNewSession`, `activeSessionId`)
- **Constants**: UPPER_SNAKE_CASE (`TEMP_USER_ID`, `API_TIMEOUT`)
- **Files**: kebab-case for utilities (`parse-drafts.ts`, `chat-interface.tsx`)
- **Types/Interfaces**: PascalCase with descriptive suffixes (`SessionProps`, `DraftData`)
- **Convex Tables**: camelCase plural (`sessions`, `messages`, `drafts`)

### State Management
- Convex for server state (sessions, messages, drafts)
- React useState for local UI state
- AI SDK useChat for streaming responses

### Multi-Agent Architecture
1. **Orchestrator**: Receives user input, researches via web_search, hands off to Writer
2. **Writer**: Generates 3 draft variations with different angles/strategies
3. Handoff via `transfer_to_writer` tool call

### Draft System
- Writer outputs drafts in specific format: `Draft 1: "Title"\n\n[content]`
- `parseDrafts()` extracts title + content from response
- DraftPanel shows up to 3 drafts side-by-side for comparison

## Environment Setup

Required environment variables (`.env.local`):
```
ANTHROPIC_API_KEY=sk-ant-...
CONVEX_DEPLOYMENT=dev:...
NEXT_PUBLIC_CONVEX_URL=https://...convex.cloud
```

### First-time Setup
```bash
pnpm install
npx convex dev          # Start Convex (creates .env.local)
pnpm dev                # Start Next.js
```

## Security

### Sensitive Data
- **Never commit** `.env`, `.env.local`, or any file with API keys
- API keys belong in `.env.local` (gitignored)
- Use `ANTHROPIC_API_KEY` env var, never hardcode

### API Keys Required
- `ANTHROPIC_API_KEY` - Claude API access (server-side only)
- Convex keys auto-managed via `npx convex dev`

### Client vs Server
- API keys must NOT be prefixed with `NEXT_PUBLIC_`
- Only `NEXT_PUBLIC_CONVEX_URL` is exposed to client

## Git Workflow

1. Run `pnpm check` before committing
2. Commits should be atomic with clear messages
3. Feature branches: `feature/<name>`
4. Bug fixes: `fix/<name>`

## Evidence Required for PRs

A pull request is reviewable when it includes:
- All checks pass (`pnpm check`)
- Build succeeds (`pnpm build`)
- Diff confined to relevant paths
- Bug fix → failing test added first, now passes
- Feature → demonstrates working behavior
- One-paragraph description covering intent

## Common Issues

### "Convex not connected"
Run `npx convex dev` in a separate terminal

### Extended thinking not showing
Ensure `providerOptions.anthropic.thinking` is configured in `/api/chat/route.ts`

### Drafts not parsing
Check Writer output matches format: `Draft N: "Title"\n\n[content]`

## Runbooks

### External Documentation
- [Convex Troubleshooting](https://docs.convex.dev/troubleshooting) - Database and backend issues
- [Anthropic API Errors](https://docs.anthropic.com/en/api/errors) - Claude API error codes
- [Vercel Deployment](https://vercel.com/docs/deployments/troubleshoot-a-build) - Build and deploy issues

### Incident Response
1. **API errors**: Check Anthropic status page, verify API key in `.env.local`
2. **Database issues**: Run `npx convex dev` to reconnect, check Convex dashboard
3. **Build failures**: Run `pnpm check` locally, review TypeScript errors
