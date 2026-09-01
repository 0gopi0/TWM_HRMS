# Graph Report - TWM HRMS  (2026-08-29)

## Corpus Check
- 4 files · ~29,887 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 455 nodes · 786 edges · 32 communities (23 shown, 9 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Backend Bootstrap & Config
- Org Chart & Frontend API
- Design Docs & Preferences
- Auth & Middleware
- Graphify Feature Set
- Org Seed Data
- Backend Dependencies
- Frontend Dependencies
- Leave Service & Approvals
- Calendar Service
- Graphify Pipeline Steps
- Core DB Schema
- Root Package Config
- Graphify Export Options
- Graphify Query Reference
- Attendance Service
- Shared Package Config
- Graphify Add & Watch
- Graphify Git Hook Guide
- Incremental Update Guide
- User Taste Preferences
- GitHub Clone & Merge
- Video Transcription Guide
- Attendance Schema
- Leave Entitlements Schema
- Extraction Spec
- Leave Requests Schema
- Employees Table

## God Nodes (most connected - your core abstractions)
1. `/graphify` - 28 edges
2. `HttpError` - 19 edges
3. `api()` - 16 edges
4. `TWM HRMS Architecture` - 14 edges
5. `getStore()` - 13 edges
6. `What You Must Do When Invoked` - 12 edges
7. `PERMISSIONS` - 12 edges
8. `useAuth()` - 11 edges
9. `asYmd()` - 10 edges
10. `CalendarPage()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Audit Trail (EXTRACTED/INFERRED/AMBIGUOUS)` --semantically_similar_to--> `Append-only audit_logs`  [INFERRED] [semantically similar]
  .agents/skills/graphify/SKILL.md → docs/architecture.md
- `Editorial Serif + Clean Sans Typography` --semantically_similar_to--> `TWM HRMS Theme`  [INFERRED] [semantically similar]
  .commandcode/taste/taste.md → frontend/index.html
- `DashboardPage()` --calls--> `labelForRole()`  [EXTRACTED]
  frontend/src/pages/DashboardPage.jsx → packages/shared/index.js
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

## Communities (32 total, 9 thin omitted)

### Community 0 - "Backend Bootstrap & Config"
Cohesion: 0.08
Nodes (42): isProd, attachEmployee(), authenticate(), authorize(), errorHandler(), notFound(), requestId(), validate() (+34 more)

### Community 1 - "Org Chart & Frontend API"
Cohesion: 0.07
Nodes (39): api(), setAccessToken(), setOnSaved(), App(), AppShell(), LINKS, AuthContext, AuthProvider() (+31 more)

### Community 2 - "Design Docs & Preferences"
Cohesion: 0.06
Nodes (34): Audit Trail (EXTRACTED/INFERRED/AMBIGUOUS), Visible Save-Confirmation Toast, Editorial Serif + Clean Sans Typography, Accuracy rules, API shape, Append-only audit_logs, TWM HRMS Architecture, Data Model (employees/payroll/leave) (+26 more)

### Community 3 - "Auth & Middleware"
Cohesion: 0.10
Nodes (23): createApp(), env, parsed, root, schema, dir, migrate(), closePool() (+15 more)

### Community 4 - "Graphify Feature Set"
Cohesion: 0.07
Nodes (34): graphify add (URL ingest), --watch folder watcher, Graph Exports (wiki/Neo4j/FalkorDB/SVG/GraphML), MCP Query Server, Extraction Subagent Prompt, GitHub Clone, Cross-repo Graph Merge, AGENTS.md Integration (+26 more)

### Community 5 - "Org Seed Data"
Cohesion: 0.09
Nodes (27): buildOrgForest(), getOrgChart(), DEPARTMENTS, salaryFor(), TEAMS, addDaysYmd(), emptyQuota(), emptyRequest() (+19 more)

### Community 6 - "Backend Dependencies"
Cohesion: 0.06
Nodes (31): dependencies, bcrypt, compression, cookie-parser, cors, dotenv, express, express-rate-limit (+23 more)

### Community 7 - "Frontend Dependencies"
Cohesion: 0.09
Nodes (22): @twm/shared, @twm/shared, dependencies, react, react-dom, react-router-dom, @twm/shared, devDependencies (+14 more)

### Community 8 - "Leave Service & Approvals"
Cohesion: 0.23
Nodes (17): assertHalfDay(), assertHasBalance(), assertLeaveWindow(), asYmd(), createLeaveRequest(), createManagedLeave(), daysConsumed(), daysUntil() (+9 more)

### Community 9 - "Calendar Service"
Cohesion: 0.13
Nodes (15): Part A - Structural extraction for code files, Part B - Semantic extraction (parallel subagents), Part C - Merge AST + semantic into final extraction, Step 0 - GitHub repos and multi-path merge (only if a URL or several paths), Step 1 - Ensure graphify is installed, Step 2.5 - Video and audio (only if video files detected), Step 2 - Detect files, Step 3 - Extract entities and relationships (+7 more)

### Community 10 - "Graphify Pipeline Steps"
Cohesion: 0.27
Nodes (14): audit_logs, departments, employees, leave_approvals, leave_requests, payment_runs, payslips, permissions (+6 more)

### Community 11 - "Core DB Schema"
Cohesion: 0.15
Nodes (12): name, private, scripts, db:migrate, dev, dev:api, dev:web, type (+4 more)

### Community 12 - "Root Package Config"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 13 - "Graphify Export Options"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 14 - "Graphify Query Reference"
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

### Community 18 - "Graphify Git Hook Guide"
Cohesion: 0.50
Nodes (3): Design & UI, Taste, Workflow

## Knowledge Gaps
- **148 isolated node(s):** `loginLimiter`, `leaveBody`, `leaveTypeSchema`, `PAYROLL_MANAGERS`, `LINKS` (+143 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PERMISSIONS` connect `Backend Bootstrap & Config` to `Org Chart & Frontend API`, `Org Seed Data`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `HttpError` connect `Backend Bootstrap & Config` to `Leave Service & Approvals`, `Auth & Middleware`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Backend Dependencies` to `Frontend Dependencies`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `loginLimiter`, `leaveBody`, `leaveTypeSchema` to the rest of the system?**
  _148 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend Bootstrap & Config` be split into smaller, more focused modules?**
  _Cohesion score 0.07824513794663049 - nodes in this community are weakly interconnected._
- **Should `Org Chart & Frontend API` be split into smaller, more focused modules?**
  _Cohesion score 0.06538461538461539 - nodes in this community are weakly interconnected._
- **Should `Design Docs & Preferences` be split into smaller, more focused modules?**
  _Cohesion score 0.06306306306306306 - nodes in this community are weakly interconnected._