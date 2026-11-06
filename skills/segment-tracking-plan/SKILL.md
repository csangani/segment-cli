---
name: segment-tracking-plan
description: Compare the analytics calls in a codebase (track, identify, group, page, screen) with a Segment Protocols tracking plan. Finds events missing from the plan, plan events the code never sends, and property mismatches, and can export the plan to a file. Use when the user asks whether their instrumentation matches the tracking plan, about Protocols violations, or to export a tracking plan.
license: MIT
compatibility: Requires the segment CLI (npm install -g csangani/segment-cli), logged in to a workspace with Protocols. See the segment-setup skill.
allowed-tools: Bash(segment read *) Bash(segment describe *) Bash(segment search *) Bash(segment auth status) Bash(segment auth status *) Grep Glob Read
---

# Tracking plan check

Compare the instrumentation in the current repository with a Segment tracking plan, using the `segment` CLI. This is read-only against Segment. Change the plan only if the user asks afterwards, following the write rules in the segment-api skill. If the user names a workspace profile, add `--profile NAME` to every `segment` command.

## 1. Pick the tracking plan

Run `segment read listTrackingPlans --all --fields id,name,type,updatedAt`.

- Exit 1 with HTTP 403/404 means Protocols isn't enabled or the token lacks access. Stop and say so.
- Match the plan the user named. Otherwise, if there is exactly one `LIVE` plan, use it. Otherwise ask the user which one.

## 2. Fetch the rules

Run `segment read listRulesFromTrackingPlan trackingPlanId=<id> --all --out <tmp>/rules.json`, using a temp directory, then work from that file. Each rule has `type` (`TRACK`, `IDENTIFY`, `GROUP`, `PAGE`, `SCREEN`, `COMMON`), `key` (the event name for TRACK rules), `jsonSchema`, `version`, and an optional `deprecatedAt`.

From each rule's `jsonSchema`, collect the event's property names and which are required. The properties usually sit at `jsonSchema.properties.properties`; identify traits sit at `jsonSchema.properties.traits`, and context at `jsonSchema.properties.context`. If a rule has several `version`s, use the highest that isn't deprecated. A short `node -e` script over the file is the easiest way to build this index.

If the user asks to export the plan, write it to `tracking-plan.<slug>.json` in the repository, sorted by type then key, and mention the path.

## 3. Find the analytics calls in the code

Scan the path the user gave, otherwise the repository root. Skip `node_modules`, build output, vendored code, and test fixtures unless asked. Search for the common Segment call shapes:

- Analytics.js / React / Next: `analytics.track("Event", {...})`, `analytics.identify(`, `analytics.page(`, `analytics.group(`, and wrappers such as `useAnalytics().track(` or `segment.track(`.
- Node (`@segment/analytics-node`): `analytics.track({ event: "Event", properties: {...} })`.
- Python: `analytics.track(user_id, "Event", {...})` or `analytics.track(user_id=..., event="Event", properties=...)`.
- iOS / Android / React Native / Flutter: `.track("Event"`, `.track(name: "Event"`, `Analytics.with(context).track(`, `.screen(`.
- Typewriter or other generated clients: calls such as `typewriter.orderCompleted({...})`. Map camelCase function names back to plan event names.
- Project-specific wrappers, for example `trackEvent(EVENTS.CHECKOUT_STARTED, ...)`. When the event name is a constant, resolve it to its string value. If a call's name is built dynamically, list it under "couldn't resolve" rather than guessing.

For each call, record: event name, file:line, and the property keys passed when they're literal.

## 4. Compare and report

Match event names exactly (Segment is case- and whitespace-sensitive), then show near-misses separately. Report in this order:

1. **Sent but not in the plan.** These will be flagged or blocked as violations. Include file:line, and the closest plan event if there's a near-match by case, spacing, or tense.
2. **Required properties missing** in calls to planned events, and **properties not in the event's schema** when it disallows `additionalProperties`.
3. **In the plan but never sent from this code.** These may come from another codebase or service, so present them as "not found here", not as dead.
4. **Deprecated rules** still being sent.
5. **Couldn't resolve:** dynamic event names that need a human to check.

End with counts (planned events, events found in code, matched, and each issue category). Then offer next steps: fix the code, or ask whether to propose plan changes via `updateRulesInTrackingPlan`, which needs explicit confirmation of the exact rules.
