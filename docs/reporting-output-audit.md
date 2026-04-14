# Reporting Output Audit

Date: 2026-03-25

## 1. Executive Summary

ReportForge AI was not primarily failing because the LLM was "bad". It was failing because the product boundary and the planning architecture were still optimized for scaffold artifacts, not finished reports.

Evidence:

- The provided sample slide HTML showed repeated section labels and repeated narrative blocks across multiple slides, which is direct output evidence of the original outline-like behavior: `context/quantity-improved-5-3-from-ord-100001-to-ord-100008-slide-outlin.html:431-482`, `:507-568`, `:595-711`, `:738-854`, `:875-902`.
- The base GAS generator summary still exposes the historical scaffold framing: `src/generators/gas/generateGasProject.ts:95`.
- The README still states that AI enhancement is primarily text-oriented, focused on title refinement, subtitle refinement, executive narrative summary, summary paragraphs, recommendations, and story-aware slide wording: `README.md:79-84`. That meant structure, page purpose, and layout diversity had to be fixed upstream.

The main issue was architectural:

- Too little intent was captured.
- There was no canonical report brief shared across slides, HTML, and GAS.
- There was no deck/report storyline planner enforcing distinct page jobs.
- AI was mostly rewriting copy on top of a generic structural plan.
- HTML and GAS were downstream victims of the same weak shared planning layer.

This patch fixes that by introducing a canonical `ReportBrief`, a shared `StoryPagePlan`, conversational intake in the taskpane, anti-repetition validation/repair, stronger chart heuristics, and story-driven renderers across slides, HTML, and GAS.

## 2. Root Causes Ranked By Impact

### 1. No shared business brief and no shared story plan

Original impact:

- The system could infer prompt keywords, but it had no canonical cross-channel model for audience, decision, benchmark, focus area, visual density, or must-have visuals.
- Each channel inherited generic findings instead of a real page-by-page story architecture.

Evidence:

- Thin prompt interpretation remained keyword-driven in `src/domain/prompt/interpretPrompt.ts:29-68`, with audience/style detection implemented as static keyword checks in `:93-218`.
- Before the patch, the engine request normalization path did not carry a structured brief through generation. The fix now wires `context.brief` in `src/reporting-engine/schemas/validateRequest.ts:90-129` and rehydrates it in `src/reporting-engine/orchestrator/generateReport.ts:23-89`.
- The canonical shared model now lives in `src/shared/types.ts:198-276` and is attached to the plan in `src/shared/types.ts:337-338`.

### 2. AI enhanced wording, but structure stayed deterministic and repetitive

Original impact:

- Users saw "AI enabled" but still received repetitive slides, repetitive HTML blocks, and scaffold-like web apps, because the LLM mostly rewrote copy after structure had already been decided.

Evidence:

- The README still describes AI enhancement primarily as a text-level upgrade layer: `README.md:79-84`.
- The LLM enhancement path still merges titles, summary paragraphs, recommendations, and slide wording in `src/services/ai/enhanceBundle.ts:94-140`, `:280-355`.
- The fallback behavior explicitly kept the deterministic path when AI failed in `src/reporting-engine/agents/narrativeAgent.ts:19-100`.

### 3. Prompt/intake context was too weak for executive-grade reporting

Original impact:

- The system was trying to infer audience, decision, style, and KPI priorities from headers and a short prompt.
- That produces generic reports even when the code is "working as designed".

Evidence:

- Prompt interpretation was still shallow and keyword-based: `src/domain/prompt/interpretPrompt.ts:29-218`.
- There was no Parlant footprint or any existing conversation framework in the repo; search returned no matches for `Parlant` or `parlant`.
- The new intake layer had to be added in `src/domain/reporting/reportBrief.ts:486-802`, `src/taskpane/App.tsx:396-402`, `:3154-3202`, and `src/taskpane/views/PlanView.tsx:282-350`.

### 4. No anti-repetition controls at the report-plan level

Original impact:

- The sample deck repeated the same narrative shell and semantic job on adjacent slides.
- Nothing enforced a distinct job to be done per page.

Evidence:

- Repeated headings in the provided sample deck:
  - `Visible Narrative`: `context/...slide-outlin.html:431`, `:507`, `:595`, `:738`, `:875`
  - `Implication`: `:471`, `:553`, `:696`, `:839`, `:887`
  - `Recommendation`: `:476`, `:558`, `:701`, `:844`, `:892`
  - `Presenter Notes`: `:481`, `:563`, `:706`, `:849`, `:897`
- The new anti-repetition validator/repair stage now exists in `src/domain/reporting/antiRepetition.ts:64-147`.

### 5. Trend narration was too naive

Original impact:

- The old narrative logic over-weighted first-vs-last movement and produced simplistic "X moved from A to B" commentary.

Evidence:

- `src/domain/planning/analyzeReportNarrative.ts:232-263` still shows the legacy trend-finding pattern built from `firstValue`, `lastValue`, and a sentence of the form `moved from ... to ...`.

### 6. HTML and GAS were template-bound rather than layout-intent driven

Original impact:

- Even when useful data existed, the web outputs read like starter shells rather than finished reporting products.

Evidence:

- The generated sample slide artifact is still named as an outline export and shows repeated narrative shells: `context/quantity-improved-5-3-from-ord-100001-to-ord-100008-slide-outlin.html:431-902`.
- The base GAS generator summary still used scaffold wording: `src/generators/gas/generateGasProject.ts:95`.
- The live Apps Script URL validation on 2026-03-25 redirected to Google sign-in, so the deployed sample was private/auth-gated and could not be visually audited anonymously.
- The upgraded HTML and GAS renderers now had to be rebuilt around story sections in:
  - `src/reporting-engine/renderers/renderCanvasDocumentHtml.ts:227-562`
  - `src/reporting-engine/renderers/renderGasProjectArtifact.ts:36-676`
  - `src/generators/gas/generateGasProject.ts:64-477`

## 3. Exact Evidence Map

### Product boundary mismatch

- Historical scaffold/outline evidence:
  - `src/generators/gas/generateGasProject.ts:95`
  - `context/quantity-improved-5-3-from-ord-100001-to-ord-100008-slide-outlin.html:431-902`
- Current README AI and template framing:
  - `README.md:79-84`
  - `README.md:201-214`

### Thin prompt interpretation

- `src/domain/prompt/interpretPrompt.ts:29-68`
- `src/domain/prompt/interpretPrompt.ts:93-218`

### AI wiring and managed relay

- Managed relay metadata in environment:
  - `.env:3-5`
  - `.env:9`
- README environment guidance:
  - `README.md:192-203`
- Relay dev path:
  - `webpack.config.js:15`

### Deterministic fallback and AI rewrite scope

- `src/reporting-engine/agents/narrativeAgent.ts:19-100`
- `src/services/ai/enhanceBundle.ts:94-140`
- `src/services/ai/enhanceBundle.ts:280-355`

### Shared brief and story planning fix

- Canonical types:
  - `src/shared/types.ts:198-276`
  - `src/shared/types.ts:337-338`
- Brief extraction/intake:
  - `src/domain/reporting/reportBrief.ts:486-802`
- Story planning:
  - `src/domain/reporting/storyPlanner.ts:273-405`
- Anti-repetition:
  - `src/domain/reporting/antiRepetition.ts:64-147`
- Chart heuristics:
  - `src/domain/reporting/chartHeuristics.ts:58-157`

### Execution-path wiring

- Bundle creation now accepts brief overrides:
  - `src/domain/orchestration/createReportBundle.ts:57-123`
- Plan construction:
  - `src/domain/planning/buildReportPlan.ts:15-55`
  - `src/domain/planning/analyzeReportNarrative.ts:111-160`
- Engine request normalization:
  - `src/reporting-engine/schemas/validateRequest.ts:90-129`
- Engine orchestration and bundle reuse:
  - `src/reporting-engine/orchestrator/generateReport.ts:23-89`
- Prompt building now includes brief signals:
  - `src/reporting-engine/prompts/buildEnginePrompt.ts:24-47`

### Channel renderers now share the story plan

- Slides:
  - `src/generators/slides/generateSlideOutline.ts:18-176`
  - `src/generators/slides/generateSlideOutline.ts:182-186`
  - `src/services/slides/slideTemplates.ts:294-301`
  - `src/services/slides/slideTemplates.ts:770-781`
- HTML:
  - `src/reporting-engine/renderers/renderCanvasDocumentHtml.ts:227-562`
- GAS:
  - `src/generators/gas/generateGasProject.ts:64-477`
  - `src/reporting-engine/renderers/renderGasProjectArtifact.ts:36-676`
- Design agent now composes from `storyPages`:
  - `src/reporting-engine/agents/designAgent.ts:307-377`

### Taskpane conversation intake

- Intake state and generation hooks:
  - `src/taskpane/App.tsx:396-402`
  - `src/taskpane/App.tsx:2491-2558`
  - `src/taskpane/App.tsx:3154-3202`
- Intake UI:
  - `src/taskpane/views/PlanView.tsx:282-350`
- Styling:
  - `src/taskpane/taskpane.css:549-579`

## 4. What The Product Claimed, What It Did, What Was Missing

| Area | Claimed | Original behavior | Missing for a finished output | Patch |
| --- | --- | --- | --- | --- |
| Slides | "PowerPoint-ready slide outline" and AI template generation | Produced readable first-pass slides, but repetitive semantics and repeated section shells were common | Real deck-level storyline, page-purpose discipline, anti-repetition, layout diversity | Shared `StoryPagePlan`, new slide generator, dynamic slide labels, anti-repetition validation |
| HTML | Elegant AI reporting canvas | Looked closer to a composition preview than a finished dashboard | Dashboard hierarchy, KPI ribbon, action framing, evidence table, story modules | New story-driven HTML renderer in `renderCanvasDocumentHtml.ts` |
| GAS | Web-app scaffold | Functional scaffold, but still too boilerplate for executive reporting | Product-grade hierarchy, stronger hero/filter/KPI/story layout | Rebuilt base generator and engine GAS renderer around story sections |
| AI | Narrative enhancement | Mostly copy rewrite layered on deterministic structure | Structural planning upstream of LLM rewrite | Brief + story plan now sit upstream; engine prompt carries decision/KPI/visual constraints |

## 5. Why Users Could Believe The Tool Was "Not Working"

Users were not imagining the problem. The old system often behaved exactly as implemented, but the implementation was below the quality bar implied by "executive report", "dashboard", or "finished deck".

The biggest mismatch was expectation:

- README language encouraged users to ask for reporting outputs.
- The actual architecture was still closer to a scaffold generator plus optional text polish.
- When AI failed, the system correctly fell back to deterministic output, but that deterministic structure was generic enough that users could interpret it as "the AI did nothing".
- Because there was no conversation layer, the system often lacked the audience, decision, and benchmark context required for a non-generic report.

## 6. Architecture Changes Made

### Shared brief and story layer

- Added canonical `ReportBrief`, `StoryPagePlan`, and intake types in `src/shared/types.ts:198-276`.
- Added brief extraction and conversational intake in `src/domain/reporting/reportBrief.ts:486-802`.
- Added storyline planning in `src/domain/reporting/storyPlanner.ts:273-405`.
- Added anti-repetition validation/repair in `src/domain/reporting/antiRepetition.ts:64-147`.
- Added chart-selection heuristics in `src/domain/reporting/chartHeuristics.ts:58-157`.

### Upstream orchestration

- Wired brief overrides into `createReportBundle` in `src/domain/orchestration/createReportBundle.ts:88-123`.
- Wired `context.brief` through engine normalization and generation in:
  - `src/reporting-engine/schemas/validateRequest.ts:90-129`
  - `src/reporting-engine/orchestrator/generateReport.ts:23-89`
  - `src/reporting-engine/prompts/buildEnginePrompt.ts:24-47`
- Aligned storyline generation to `storyPages` in `src/reporting-engine/analysis/buildStoryline.ts:67-91`.

### UX / taskpane

- Added natural conversation intake and "Generate Now" control in:
  - `src/taskpane/App.tsx:396-402`
  - `src/taskpane/App.tsx:3154-3202`
  - `src/taskpane/views/PlanView.tsx:282-350`

### Output channels

- Slides now generate from `storyPages` instead of a generic repeated shell:
  - `src/generators/slides/generateSlideOutline.ts:18-176`
- HTML now renders as a report/dashboard surface:
  - `src/reporting-engine/renderers/renderCanvasDocumentHtml.ts:227-562`
- GAS now renders as a dashboard-oriented app:
  - `src/generators/gas/generateGasProject.ts:64-477`
  - `src/reporting-engine/renderers/renderGasProjectArtifact.ts:36-676`

## 7. Short-Term Patch Plan

Status: completed in this patch.

1. Add a canonical report brief model and pass it through the generation stack.
2. Add natural intake conversation with a user-controlled "generate now" stop point.
3. Add shared story planning upstream of slides, HTML, and GAS.
4. Add anti-repetition validation and repair.
5. Upgrade chart-selection heuristics by page purpose and data semantics.
6. Rebuild HTML and GAS outputs around dashboard/report composition rather than scaffold shells.
7. Add focused tests for brief extraction, story planning, anti-repetition, chart heuristics, and output structure.

## 8. Medium-Term Roadmap

1. Add stronger semantic profiling beyond header heuristics:
   - benchmark detection
   - fiscal/time-grain detection
   - customer/product/channel taxonomy
2. Add richer chart grammars:
   - waterfall
   - variance bridges
   - small multiples
   - exception heatmaps
3. Add channel-specific design systems:
   - board deck
   - operating dashboard
   - finance review
   - client story
4. Add stronger brand systems:
   - palette presets
   - typography presets
   - logo/title treatments
5. Add a second-pass report validator:
   - narrative redundancy score
   - KPI overuse score
   - chart misuse score
   - empty-context warnings before generation
6. Add live-data adapters for GAS beyond embedded payload scaffolds.

## 9. Validation Summary

Validation completed locally:

- `npm run typecheck`
- `npm test`

Result:

- Full test suite passed: 140/140.

New focused tests added:

- `tests/reportBrief.test.ts`
- `tests/storyPlanner.test.ts`
- `tests/antiRepetition.test.ts`
- `tests/chartHeuristics.test.ts`
- `tests/reportingOutputQuality.test.ts`
