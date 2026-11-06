---
name: segment-audit-trail
description: Summarize recent changes in a Segment workspace from the audit trail (who changed which source, destination, tracking plan, or user, and when), optionally filtered to one resource or time window. Use when the user asks what changed in Segment, who disabled or deleted something, or for recent activity.
license: MIT
compatibility: Requires the segment CLI (npm install -g segment-cli), logged in. See the segment-setup skill.
allowed-tools: Bash(segment read *) Bash(segment describe *) Bash(segment auth status) Bash(segment auth status *)
---

# Segment audit trail

Read-only. Answer "what changed?" from `listAuditEvents` with the `segment` CLI. If the user names a workspace profile, add `--profile NAME` to every command.

## Scope

Work out the window and filter from the user's request:

- A duration such as "last 24 hours" or "this week", or a start date. Default to the last 7 days. Send it as `startTime=<ISO-8601 UTC>`.
- A resource name such as `iOS app` or `Amplitude prod`. Resolve it to an ID first, with `segment read listSources --all --fields id,name` (or `listDestinations` / `listTrackingPlans`), then pass `resourceId=<id>`. If several resources match, ask which one.
- A resource type such as sources or tracking plans. Pass `resourceType=<type>`. If the API rejects the value, drop the filter and filter the results yourself.

## Collect

```
segment read listAuditEvents startTime=<ISO> [resourceId=<id>] [resourceType=<type>] --all --max-pages 20 --fields timestamp,type,actor,actorEmail,resourceType,resourceName,resourceId
```

If stderr says it stopped after `--max-pages`, tell the user the window was truncated and offer to narrow it.

## Report

- One line up front: how many events, in what window, by how many actors.
- **High-impact changes first:** anything whose `type` indicates a deletion, a disable, a permission or IAM change, a token change, a regulation, or a tracking plan change.
- Then group by resource (`resourceType` / `resourceName`), newest first, with timestamp, event type, and actor (prefer `actorEmail`; API-token actors show as token IDs).
- Call out bursts: many changes by one actor in a short span, or changes by an API token rather than a person.

Show times in UTC and say so. Don't speculate about intent; report what the trail shows.
