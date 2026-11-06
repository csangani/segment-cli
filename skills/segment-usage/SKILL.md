---
name: segment-usage
description: Report Segment Monthly Tracked Users (MTU) and API call usage for a month, for the whole workspace and per source, with the top contributors. Use when the user asks about Segment MTUs, usage, billing drivers, or which sources send the most.
license: MIT
compatibility: Requires the segment CLI (npm install -g github:csangani/segment-cli), logged in. See the segment-setup skill.
allowed-tools: Bash(segment read *) Bash(segment describe *) Bash(segment auth status) Bash(segment auth status *)
---

# Segment usage report

Read-only. Report MTU and API call usage for one usage month with the `segment` CLI. If the user names a workspace profile, add `--profile NAME` to every command.

## Period

The API's `period` parameter is the first day of the usage month, for example `2026-11-01`. Use the month the user asked about (`2026-10`, `October 2026`, `last month`). Otherwise use the current month. If the workspace's billing cycle doesn't start on the 1st and the API rejects or returns nothing for the period, say so and ask for the cycle start date.

## Collect

Run these with your shell tool (they can run in parallel). Replace `P` with the period:

```
segment read getDailyWorkspaceMTUUsage period=P --all
segment read getDailyPerSourceMTUUsage period=P --all
segment read getDailyWorkspaceAPICallsUsage period=P --all
segment read getDailyPerSourceAPICallsUsage period=P --all
segment read listSources --all --fields id,name,slug
```

Count values (`identified`, `anonymous`, `anonymousIdentified`, `neverIdentified`, `apiCalls`) are bigint strings, so convert them before adding. The API describes these rows as daily cumulative counts, so the latest `timestamp` is the month-to-date figure; don't add daily rows together. Per-source responses can be large. If one is saved to a file, process it with a short `node -e` script rather than reading it all.

## Report

1. **Workspace totals:** month-to-date MTU (identified + anonymous, with the breakdown) and API calls, as of the latest snapshot timestamp.
2. **Trend:** how the cumulative figures grew over the month. Weekly checkpoints are enough.
3. **Top sources:** top 10 by MTU and top 10 by API calls, by name, with each source's share of the total.
4. **Notable:** sources with high anonymous-to-identified ratios, sources with API calls but near-zero MTU, and sudden jumps between snapshots.

Note that these figures come from the Public API's usage endpoints, and that the Segment app's billing page is authoritative for invoicing.
