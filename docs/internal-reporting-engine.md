# Internal Reporting Engine

## Purpose

`reporting-engine/` is the internal AI reporting module described in the product brief. It is embedded in the add-in codebase and powers the in-addin Canvas Studio plus the internal API hook.

It exposes a clean API:

```ts
import { generateReport } from "../src/reporting-engine";
```

## What it does today

The engine orchestrates the current reusable product bricks:
- source normalization
- data profiling
- report bundle creation
- optional LLM narrative enhancement
- report planning
- multi-format artifact rendering

Current built-in outputs:
- `html`
- `pptx`
- `pdf`
- `slides-json`
- `email-html`
- `gas-project`
- `excel-plan`

## Folder structure

```text
src/reporting-engine/
  agents/
  adapters/
  domain/
  orchestrator/
  prompts/
  renderers/
  schemas/
```

## Activation

Canvas Studio is now enabled by default in the taskpane. You can still control the lower-level engine hook with the runtime flag:

```env
REPORTFORGE_INTERNAL_REPORTING_ENGINE=true
```

Then restart the dev server. The taskpane registers:

```ts
window.__REPORTFORGE_INTERNAL_ENGINE__
```

The hook exposes:

```ts
await window.__REPORTFORGE_INTERNAL_ENGINE__.generateReport(request)
```

## Example call

```ts
await window.__REPORTFORGE_INTERNAL_ENGINE__.generateReport({
  source: {
    kind: "dataset",
    dataset: {
      sourceLabel: "Quarterly Revenue",
      headers: ["Month", "Region", "Revenue", "Cost"],
      rows: [
        ["2026-01", "North", 120000, 82000],
        ["2026-02", "North", 131000, 86000],
        ["2026-01", "South", 117000, 79000],
      ],
    },
  },
  context: {
    prompt: "Prepare a client-ready performance review deck and companion HTML report.",
    audience: "client",
    objective: "recommend",
    preferredFormats: ["html", "pptx", "email-html", "gas-project"],
    maxSlides: 6,
  },
  options: {
    enableLlm: true,
  },
});
```

## Notes

- `excel-plan` is intentionally a render plan, not a fake workbook export. Real sheet writing remains handled by the Office host adapter.
- `pptx` and `pdf` exports reuse the existing slide export services.
- The engine can consume a `snapshot`, a `dataset`, or an existing `bundle`.
- The standard end-user flow still works without entering Canvas Studio.
- Canvas Studio reuses this engine to generate HTML reports, PowerPoint decks, PDFs, email artifacts, and Apps Script scaffolds from the current selection plus a prompt.
