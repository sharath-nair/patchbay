# Patchbay

A node-based AI workflow builder. Wire up triggers, prompts, routers and outputs on a canvas, then run the graph and watch data flow between nodes.

**Stack:** Next.js (App Router) · React Flow (`@xyflow/react`) · Zustand · Zod + React Hook Form · Tailwind + shadcn/ui · Vitest + Playwright

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (Vitest) |
| `npm run e2e` | End-to-end tests (Playwright) |

## Roadmap

- [x] M0: Scaffold, folder structure, core types
- [x] M1: Canvas and node registry
- [x] M2: Zustand store with per-node selectors
- [x] M3: Schema-driven property editor
- [x] M4: Undo/redo history
- [x] M5: Simulated execution engine
- [ ] M6: Persistence, dashboard, import/export
- [ ] M7: Polish, CI, deploy
