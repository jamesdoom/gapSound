# GapSound agent instructions

Build a local-first, single-user cybersecurity intelligence and training application. Read TASKS.md, ROADMAP.md, HANDOFF.md and SECURITY.md before each iteration. The authoritative user specification is preserved in docs/MASTER_SPECIFICATION.md.

## Architecture and conventions

Next.js App Router, strict TypeScript, React, Tailwind, Lucide, Zod, Drizzle and local SQLite via libSQL. UI: src/components. Trust boundaries: src/lib/security.ts. Services: src/services. Schema: src/db/schema.ts. Reviewed SQL migrations: migrations. Keep database and external requests server-side. Use UTC persistence and local display dates. Do not invent live data. Planned modules must be labeled.

## Security

Remain bound to 127.0.0.1:3000. Do not deploy publicly or add paid services, AI calls, executable labs, authentication or multi-user access without approval. No arbitrary URL fetching, shell execution from input, raw HTML rendering, secret logging or committed credentials. Validate input, bound resources and use parameterized database operations. Preserve user data and existing changes. No destructive Git operations. User explicitly requests commit and push after each completed update.

## Approved commands and definition of done

Use project-local tools: npm install (npm ci after lockfile exists), npm run db:migrate, npm run dev, npm run typecheck, npm run lint, npm test, npm run build, npm audit, npm run format. No global installations. Add meaningful tests for features and security boundaries; do not use live services in routine tests. A completed update passes typecheck, lint, relevant tests and production build, updates documentation/backlog/handoff, and is committed and pushed. Record checks that cannot run honestly. Normal npm works in the user’s VS Code terminal; only the restricted agent shell needs this fallback: node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" followed by npm arguments.

## Resume

Read HANDOFF.md for verification and limitations. Work through Phase 1 tasks in priority order; no Phase 2 work without user approval. Prefer complete vertical slices. Never claim all Phase 1 requirements are met while backlog items remain. Update HANDOFF.md before ending a session.
