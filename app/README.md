# Successor - application

Business Owner Knowledge Succession Platform. React + TypeScript + Vite,
local-first (localStorage), no backend, no telemetry.

## Commands
- `npm install` - once
- `npm run dev` - run locally
- `npm run build` - typecheck + production build
- `npm test` - full suite including the end-to-end acceptance run

## Where things live
- `src/knowledge-model/` - the frozen v1.0.0 schema contract (see 01-schema/)
- `src/project/` - project file, storage, sessions, migration
- `src/interview/` - the eight-track rule-based interview engine
- `src/analysis/` - document extraction and conflict surfacing
- `src/deliverables/` - the nine-document succession package renderers
- `src/dashboard/` - metrics, risk scoring, gap resolution

The build's governing documents are in `../00-control/`. Read CLAUDE.md
before changing anything.
