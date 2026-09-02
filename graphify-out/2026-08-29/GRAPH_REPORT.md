# Graph Report - TWM HRMS  (2026-08-29)

## Corpus Check
- 70 files · ~26,975 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 389 nodes · 751 edges · 26 communities (22 shown, 4 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9a7d3957`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- HttpError
- api
- dependencies
- store/index.js
- frontend/package.json
- 001_schema.sql
- What You Must Do When Invoked
- package.json
- shared/package.json
- TWM HRMS architecture
- 004_calendar.sql
- graphify reference: extra exports and benchmark
- graphify reference: query, path, explain
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native AGENTS.md integration
- graphify reference: incremental update and cluster-only
- Taste
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- extraction-spec.md
- getStore
- shared/index.js
- leaveService.js

## God Nodes (most connected - your core abstractions)
1. `HttpError` - 35 edges
2. `getStore()` - 32 edges
3. `api()` - 21 edges
4. `useAuth()` - 17 edges
5. `PERMISSIONS` - 13 edges
6. `What You Must Do When Invoked` - 12 edges
7. `TWM HRMS architecture` - 11 edges
8. `employees` - 10 edges
9. `CalendarPage()` - 10 edges
10. `/graphify` - 10 edges

## Surprising Connections (you probably didn't know these)
- `authorize()` --calls--> `hasPermission()`  [EXTRACTED]
  backend/src/middleware/authorize.js → packages/shared/index.js
- `AppShell()` --calls--> `labelForRole()`  [EXTRACTED]
  frontend/src/AppShell.jsx → packages/shared/index.js
- `DashboardPage()` --calls--> `labelForRole()`  [EXTRACTED]
  frontend/src/pages/DashboardPage.jsx → packages/shared/index.js
- `decideLeave()` --calls--> `hasPermission()`  [EXTRACTED]
  backend/src/services/leaveService.js → packages/shared/index.js
- `buildOrgForest()` --calls--> `labelForRole()`  [EXTRACTED]
  backend/src/services/orgService.js → packages/shared/index.js

## Import Cycles
- None detected.

## Communities (26 total, 4 thin omitted)

### Community 0 - "HttpError"
Cohesion: 0.11
Nodes (31): createApp(), isProd, attachEmployee(), authenticate(), authorize(), errorHandler(), notFound(), requestId() (+23 more)

### Community 1 - "api"
Cohesion: 0.07
Nodes (46): api(), setAccessToken(), App(), Guard(), AppShell(), LINKS, AuthContext, AuthProvider() (+38 more)

### Community 2 - "dependencies"
Cohesion: 0.06
Nodes (33): dependencies, bcrypt, compression, cookie-parser, cors, dotenv, express, express-rate-limit (+25 more)

### Community 3 - "store/index.js"
Cohesion: 0.15
Nodes (18): env, parsed, root, schema, dir, migrate(), closePool(), getPool() (+10 more)

### Community 4 - "frontend/package.json"
Cohesion: 0.09
Nodes (21): dependencies, react, react-dom, react-router-dom, @twm/shared, devDependencies, vite, @vitejs/plugin-react (+13 more)

### Community 5 - "001_schema.sql"
Cohesion: 0.23
Nodes (15): audit_logs, departments, employees, leave_approvals, leave_requests, payment_runs, payslips, permissions (+7 more)

### Community 6 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native AGENTS.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 7 - "package.json"
Cohesion: 0.15
Nodes (12): name, private, scripts, db:migrate, dev, dev:api, dev:web, type (+4 more)

### Community 8 - "shared/package.json"
Cohesion: 0.33
Nodes (5): exports, main, name, type, version

### Community 11 - "TWM HRMS architecture"
Cohesion: 0.08
Nodes (22): Accuracy rules, API shape, Data model sketch, Goals, Organization and four roles, Out of scope for this foundation, Permission model, Repo layout (+14 more)

### Community 13 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 14 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 15 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 16 - "graphify reference: commit hook and native AGENTS.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native AGENTS.md integration, graphify reference: commit hook and native AGENTS.md integration

### Community 17 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 18 - "Taste"
Cohesion: 0.50
Nodes (3): Design & UI, Taste, Workflow

### Community 23 - "getStore"
Cohesion: 0.17
Nodes (19): clockIn(), clockOut(), dayKey(), getAttendanceStatus(), mapEntry(), issueSession(), login(), logout() (+11 more)

### Community 24 - "shared/index.js"
Cohesion: 0.14
Nodes (17): decideLeave(), buildOrgForest(), getOrgChart(), ALL, DEMO_ACCOUNTS, DEMO_PASSWORD, hasPermission(), labelForRole() (+9 more)

### Community 25 - "leaveService.js"
Cohesion: 0.31
Nodes (13): assertHasBalance(), assertLeaveWindow(), asYmd(), createLeaveRequest(), createManagedLeave(), daysUntil(), getLeaveBalances(), inclusiveDays() (+5 more)

## Knowledge Gaps
- **129 isolated node(s):** `name`, `version`, `type`, `main`, `dev` (+124 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PERMISSIONS` connect `HttpError` to `shared/index.js`, `leaveService.js`, `api`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `getStore()` connect `getStore` to `HttpError`, `leaveService.js`, `store/index.js`, `shared/index.js`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `HttpError` connect `HttpError` to `shared/index.js`, `leaveService.js`, `getStore`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `name`, `version`, `type` to the rest of the system?**
  _129 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `HttpError` be split into smaller, more focused modules?**
  _Cohesion score 0.11428571428571428 - nodes in this community are weakly interconnected._
- **Should `api` be split into smaller, more focused modules?**
  _Cohesion score 0.06716417910447761 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._