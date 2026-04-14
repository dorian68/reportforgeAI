# Reporting Quality Before / After

## Dataset

Sample range:

| Month | Region | Revenue | Cost | Margin % |
| --- | --- | ---: | ---: | ---: |
| 2026-01-01 | West | 124200 | 82950 | 66.8 |
| 2026-01-01 | East | 118000 | 79950 | 64.0 |
| 2026-02-01 | West | 130400 | 85800 | 67.6 |
| 2026-02-01 | East | 124000 | 82500 | 66.0 |

## Before

Typical blueprint-style output:

- Title: `Executive Summary`
- Subtitle: `Monthly performance review`
- Bullet: `Use a KPI scorecard to show topline and margin.`
- Bullet: `Add a chart to explain regional performance.`
- Speaker notes carried most of the useful language.
- The user still had to rewrite the slide before sending it to a client or steering committee.

## After

Current message-led output generated from the same dataset:

- Title: `Revenue improved +5.0% from 2026-01-01 to 2026-02-01`
- Subtitle: `4 rows across 5 columns from Sales Data from A1:E5, prepared for executive review.`
- Visible narrative:
  - `Revenue moved from 242.2K to 254.4K, a noticeable shift over the observed month.`
  - `Cost moved from 162.9K to 168.3K, a noticeable shift over the observed month.`
  - `The dataset is well populated, so the narrative can stay decision-oriented rather than purely directional.`
- Implication:
  - `Leadership can treat the latest movement as decision-grade evidence instead of a directional early signal.`
- Recommendation:
  - `Confirm whether the improvement in revenue is repeatable in the next cycle and which driver should be scaled.`

## Product Standard

The reporting engine is now expected to produce:

- message-led titles instead of topic labels
- visible interpretation on the slide or in the report body
- audience-aware wording
- evidence points tied to actual metrics
- recommendation and caveat fields carried through to HTML, email, slides, and PPT/PDF exports

The engine should not regress to:

- `Use a chart to...`
- `This slide should...`
- generic `Executive Summary` labels with no message
- narrative hidden only in speaker notes
