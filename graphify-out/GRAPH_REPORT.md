# Graph Report - TWM HRMS  (2026-09-02)

## Corpus Check
- 103 files · ~58,421 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 619 nodes · 1131 edges · 63 communities (44 shown, 19 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `aff95f1b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- getStore
- shared/index.js
- TWM HRMS Architecture
- store/index.js
- /graphify
- PayrollPage.jsx
- dependencies
- frontend/package.json
- leaveService.js
- What You Must Do When Invoked
- 001_schema.sql
- scripts
- graphify reference: extra exports and benchmark
- graphify reference: query, path, explain
- shared/package.json
- Attendance Service
- Shared Package Config
- Graphify Add & Watch
- taste/taste/taste.md
- Incremental Update Guide
- User Taste Preferences
- employees
- employees
- extraction-spec.md
- 004_calendar.sql
- employees
- employees
- The Website Makers Logo
- ThemeSwitch.jsx
- api
- OrgChart.jsx
- verify_status.mjs
- e2e_org.mjs
- dbg_leave.mjs
- dbg_rows.mjs
- dbg_status.mjs
- e2e_sidebar.mjs
- db-up.sh
- e2e_leave.mjs
- hover_click.mjs
- leave_requests
- auth.jsx
- EmployeesPage.jsx
- App.jsx
- DashboardPage.jsx
- Deploying to Hostinger Business (Node.js hosting)
- CalendarPage.jsx
- password_reset_tokens
- ApprovalsPage

## God Nodes (most connected - your core abstractions)
1. `getStore()` - 47 edges
2. `HttpError` - 45 edges
3. `api()` - 34 edges
4. `/graphify` - 28 edges
5. `useAuth()` - 23 edges
6. `EmployeesPage()` - 16 edges
7. `TWM HRMS Architecture` - 14 edges
8. `PayrollPage()` - 13 edges
9. `PERMISSIONS` - 13 edges
10. `DashboardPage()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Audit Trail (EXTRACTED/INFERRED/AMBIGUOUS)` --semantically_similar_to--> `Append-only audit_logs`  [INFERRED] [semantically similar]
  .agents/skills/graphify/SKILL.md → docs/architecture.md
- `Editorial Serif + Clean Sans Typography` --semantically_similar_to--> `TWM HRMS Theme`  [INFERRED] [semantically similar]
  .commandcode/taste/taste.md → frontend/index.html
- `AppShell()` --calls--> `labelForRole()`  [EXTRACTED]
  frontend/src/AppShell.jsx → packages/shared/index.js
- `TWM HRMS` --conceptually_related_to--> `React SPA Entry (index.html)`  [INFERRED]
  README.md → frontend/index.html
- `React SPA Entry (index.html)` --conceptually_related_to--> `React + Express + MySQL Stack`  [INFERRED]
  frontend/index.html → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Reference Flows** — _agents_skills_graphify_references_add_watch_add, _agents_skills_graphify_references_add_watch_watch, _agents_skills_graphify_references_exports_graph_exports, _agents_skills_graphify_references_exports_mcp, _agents_skills_graphify_references_extraction_spec_extraction_spec, _agents_skills_graphify_references_github_and_merge_clone, _agents_skills_graphify_references_github_and_merge_merge_graphs, _agents_skills_graphify_references_hooks_commit_hook, _agents_skills_graphify_references_hooks_agents_integration, _agents_skills_graphify_references_query_query, _agents_skills_graphify_references_query_path, _agents_skills_graphify_references_query_explain, _agents_skills_graphify_references_query_vocab_expansion, _agents_skills_graphify_references_query_save_result, _agents_skills_graphify_references_transcribe_transcribe, _agents_skills_graphify_references_update_incremental_update, _agents_skills_graphify_references_update_cluster_only [EXTRACTED 1.00]
- **Document Extraction Pipeline** — _agents_skills_graphify_skill_ast_extraction, _agents_skills_graphify_skill_semantic_extraction, _agents_skills_graphify_skill_graph_json [INFERRED 0.85]
- **Role-Based Access Control Model** — docs_architecture_roles, docs_architecture_rbac, docs_architecture_permission_codes [INFERRED 0.85]

## Communities (63 total, 19 thin omitted)

### Community 0 - "getStore"
Cohesion: 0.06
Nodes (70): createApp(), frontendDist, attachEmployee(), authenticate(), authorize(), errorHandler(), notFound(), requestId() (+62 more)

### Community 1 - "shared/index.js"
Cohesion: 0.11
Nodes (21): buildOrgForest(), computeStatusById(), getOrgChart(), DEPARTMENTS, salaryFor(), TEAMS, DEMO_GROUPS, groupDemoAccounts() (+13 more)

### Community 2 - "TWM HRMS Architecture"
Cohesion: 0.06
Nodes (34): Audit Trail (EXTRACTED/INFERRED/AMBIGUOUS), Visible Save-Confirmation Toast, Editorial Serif + Clean Sans Typography, Accuracy rules, API shape, Append-only audit_logs, TWM HRMS Architecture, Data Model (employees/payroll/leave) (+26 more)

### Community 3 - "store/index.js"
Cohesion: 0.11
Nodes (27): env, isProd, parsed, root, schema, dir, migrate(), closePool() (+19 more)

### Community 4 - "/graphify"
Cohesion: 0.07
Nodes (34): graphify add (URL ingest), --watch folder watcher, Graph Exports (wiki/Neo4j/FalkorDB/SVG/GraphML), MCP Query Server, Extraction Subagent Prompt, GitHub Clone, Cross-repo Graph Merge, AGENTS.md Integration (+26 more)

### Community 5 - "PayrollPage.jsx"
Cohesion: 0.14
Nodes (22): currentPeriod(), EXCLUDED_FROM_PAYROLL, fmtInr(), newEmptyExtra(), PAYROLL_OPERATORS, PayrollPage(), load(), removePayslip() (+14 more)

### Community 6 - "dependencies"
Cohesion: 0.06
Nodes (35): dependencies, bcrypt, compression, cookie-parser, cors, dotenv, express, express-rate-limit (+27 more)

### Community 7 - "frontend/package.json"
Cohesion: 0.09
Nodes (21): dependencies, react, react-dom, react-router-dom, @twm/shared, devDependencies, vite, @vitejs/plugin-react (+13 more)

### Community 8 - "leaveService.js"
Cohesion: 0.25
Nodes (17): assertHalfDay(), assertHasBalance(), assertLeaveWindow(), asYmd(), createLeaveRequest(), createManagedLeave(), daysConsumed(), daysUntil() (+9 more)

### Community 9 - "What You Must Do When Invoked"
Cohesion: 0.13
Nodes (15): Part A - Structural extraction for code files, Part B - Semantic extraction (parallel subagents), Part C - Merge AST + semantic into final extraction, Step 0 - GitHub repos and multi-path merge (only if a URL or several paths), Step 1 - Ensure graphify is installed, Step 2.5 - Video and audio (only if video files detected), Step 2 - Detect files, Step 3 - Extract entities and relationships (+7 more)

### Community 10 - "001_schema.sql"
Cohesion: 0.19
Nodes (16): audit_logs, departments, employees, leave_approvals, leave_requests, payment_runs, payslips, permissions (+8 more)

### Community 11 - "scripts"
Cohesion: 0.11
Nodes (17): allowScripts, bcrypt@5.1.1, esbuild@0.25.12, name, private, scripts, build, db:migrate (+9 more)

### Community 12 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 13 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 14 - "shared/package.json"
Cohesion: 0.33
Nodes (5): exports, main, name, type, version

### Community 15 - "Attendance Service"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 16 - "Shared Package Config"
Cohesion: 0.50
Nodes (3): For git commit hook, For native AGENTS.md integration, graphify reference: commit hook and native AGENTS.md integration

### Community 17 - "Graphify Add & Watch"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 18 - "taste/taste/taste.md"
Cohesion: 0.40
Nodes (3): Design & UI, Taste, Workflow

### Community 32 - "ThemeSwitch.jsx"
Cohesion: 0.21
Nodes (6): ForgotPasswordPage(), ResetPasswordPage(), useTheme(), OPTIONS, SignOutButton(), ThemeSwitch()

### Community 33 - "api"
Cohesion: 0.17
Nodes (17): api(), load(), punch(), addDaysYmd(), daysInclusive(), emptyQuota(), emptyRequest(), EXCLUDED_FROM_LEAVE_MANAGEMENT (+9 more)

### Community 34 - "OrgChart.jsx"
Cohesion: 0.29
Nodes (7): findNode(), findParent(), initialsFor(), OrgChart(), OrgDetail(), OrgNode(), STATUS_META

### Community 35 - "verify_status.mjs"
Cohesion: 0.29
Nodes (5): api(), from, login(), T, to

### Community 55 - "auth.jsx"
Cohesion: 0.18
Nodes (11): setAccessToken(), setOnSaved(), App(), AuthContext, AuthProvider(), loadMe(), applyTheme(), ThemeContext (+3 more)

### Community 56 - "EmployeesPage.jsx"
Cohesion: 0.21
Nodes (16): dayKey(), EmployeesPage(), cancelEdit(), closeLopModal(), load(), openLopModal(), removeEmployee(), startEdit() (+8 more)

### Community 57 - "App.jsx"
Cohesion: 0.24
Nodes (11): EmployeesRoute(), Guard(), LeaveRoute(), AppShell(), Icons, navAllowed(), stroke, TOP_NAV (+3 more)

### Community 58 - "DashboardPage.jsx"
Cohesion: 0.28
Nodes (11): DashboardPage(), dayKey(), daysInclusive(), fmtDuration(), formatTime(), greet(), inMonth(), fmtDate() (+3 more)

### Community 59 - "Deploying to Hostinger Business (Node.js hosting)"
Cohesion: 0.18
Nodes (10): 1. Create the database, 2. Create the Node.js app, 3. Get the code onto the server, 4. Set environment variables, 5. Install, build, migrate, 6. Start the app, Deploying to Hostinger Business (Node.js hosting), Redeploying after a code change (+2 more)

### Community 60 - "CalendarPage.jsx"
Cohesion: 0.31
Nodes (9): buildCells(), CalendarPage(), load(), monthLabel(), pad(), shiftMonth(), todayYmd(), WEEKDAYS (+1 more)

### Community 62 - "ApprovalsPage"
Cohesion: 1.00
Nodes (3): ApprovalsPage(), decide(), load()

## Knowledge Gaps
- **190 isolated node(s):** `Taste`, `name`, `version`, `type`, `main` (+185 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `api` to `ThemeSwitch.jsx`, `PayrollPage.jsx`, `auth.jsx`, `EmployeesPage.jsx`, `App.jsx`, `DashboardPage.jsx`, `CalendarPage.jsx`, `ApprovalsPage`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `getStore()` connect `getStore` to `leaveService.js`, `shared/index.js`, `store/index.js`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `PERMISSIONS` connect `getStore` to `shared/index.js`, `api`, `PayrollPage.jsx`, `EmployeesPage.jsx`, `App.jsx`, `CalendarPage.jsx`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `Taste`, `name`, `version` to the rest of the system?**
  _190 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `getStore` be split into smaller, more focused modules?**
  _Cohesion score 0.059025394646533974 - nodes in this community are weakly interconnected._
- **Should `shared/index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11384615384615385 - nodes in this community are weakly interconnected._
- **Should `TWM HRMS Architecture` be split into smaller, more focused modules?**
  _Cohesion score 0.06306306306306306 - nodes in this community are weakly interconnected._