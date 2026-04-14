# ReportForge AI Smoke Matrix

Run this matrix before any pilot or production release.

## Supported Hosts

- Excel Desktop on Windows
- Excel on the web
- Excel on Mac

## Common Pre-Checks

- Open the production build from the packaged `dist/manifest.xml`
- Confirm the task pane loads without startup warnings
- Confirm the support page and production URLs resolve over HTTPS
- Confirm `REPORTFORGE_BASE_URL` matches the deployed asset host

## Core Smoke Flow

Run the following in each supported host:

1. Cold start the add-in in a workbook with a known clean sample table
2. Analyze a valid rectangular selection with headers
3. Change the selection and analyze again
4. Confirm the previous plan is invalidated and outputs stay disabled until the new plan is ready
5. Generate the Excel report
6. Run Agent Mode with:
   - table structuring
   - formatting
   - header freeze
   - workbook report generation
7. Reopen the workbook and repeat analysis/report generation

## Negative / Hardening Flow

Run the following in each supported host:

1. Analyze an empty selection
2. Analyze a one-row selection
3. Analyze an oversized selection and verify:
   - confirmation gate appears for confirm-tier ranges
   - blocked-tier ranges refuse analysis
4. Simulate storage failure or restricted storage and verify:
   - startup does not crash
   - degraded persistence banner is visible
5. Simulate Google timeout and verify:
   - busy state clears
   - friendly error appears
   - diagnostics capture the failure
6. Simulate expired Google token and verify:
   - connection downgrades automatically
   - Gmail/App Script actions require reconnect
7. Disable or mock unsupported Excel capabilities and verify:
   - workbook actions degrade gracefully
   - no host crash occurs
8. Repeat major actions rapidly and verify state remains coherent

## Large-Range Checks

- Test a normal safe range under the default thresholds
- Test a confirm-tier range
- Test a blocked-tier range
- Verify large renders skip expensive autofit/chart work as expected

## Release Gate

Do not release if any of the following fails:

- startup fallback path
- re-analysis freshness / stale-plan invalidation
- workbook report generation
- degraded persistence visibility
- Google timeout cleanup
- expired token downgrade
- diagnostics export
