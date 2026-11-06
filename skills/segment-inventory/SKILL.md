---
name: segment-inventory
description: Map a Segment workspace's sources, the destinations and warehouses each feeds, tracking plans, and Engage spaces, and flag configuration problems such as disabled sources, orphaned destinations, and sources sending nowhere. Use when the user asks what's in their Segment workspace, for an overview or audit of its setup, or where a source's data goes.
license: MIT
compatibility: Requires the segment CLI (npm install -g segment-cli), logged in. See the segment-setup skill.
allowed-tools: Bash(segment read *) Bash(segment describe *) Bash(segment search *) Bash(segment auth status) Bash(segment auth status *)
---

# Segment workspace inventory

Build a read-only map of the workspace with the `segment` CLI. This skill never writes to Segment. If the user names a workspace profile, add `--profile NAME` to every command.

## Collect

Run these with your shell tool. They are independent, so you can run them in parallel:

```
segment read getWorkspace
segment read listSources --all --fields id,name,slug,enabled,metadata.name,metadata.categories
segment read listDestinations --all --fields id,name,enabled,sourceId,metadata.name
segment read listWarehouses --all --fields id,enabled,metadata.name
segment read listTrackingPlans --all --fields id,name,type,updatedAt
segment read listSpaces --all --fields id,name,slug
```

For warehouse-to-source links, run `segment read listConnectedSourcesFromWarehouse warehouseId=<id> --all --fields id` for each warehouse. Skip this when there are more than 10 warehouses, and say you skipped it.

Expect exit 1 with HTTP 403/404 from `listTrackingPlans` (needs Protocols) and `listSpaces` (needs Engage). Report those as "feature not enabled or token lacks access", not as failures. Exit 3 means not logged in: follow the segment-setup skill. If output was saved to a file, read the file rather than re-fetching.

## Analyse

Join destinations to sources on `sourceId`. Then flag:

- Sources that are **enabled with no enabled destinations and no warehouse**: data comes in and goes nowhere.
- **Disabled sources** that still have enabled destinations.
- **Disabled destinations**: list them, since they may be intentional.
- Destinations whose `sourceId` matches **no source**: orphaned.
- Many destinations of the same type (`metadata.name`) on one source, which may be duplicates.
- **LIVE tracking plans** and when each was last updated.

## Report

Start with counts: sources (enabled/total), destinations (enabled/total), warehouses, tracking plans, and spaces. Then show a compact tree: source → destinations (type, enabled) → warehouses. For workspaces with more than 40 sources, show the flagged items plus a per-source-type summary instead of the full tree. End with the flagged issues, most important first, each with source and destination names and IDs.

If the user asks to save the report, write it to `segment-inventory.md` in the current directory. Don't include write keys or settings values.
