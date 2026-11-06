---
name: segment-api
description: Read or change a Twilio Segment workspace through the Segment Public API using the `segment` CLI (npm package segment-cli). Use when the user mentions Segment, their Segment workspace, sources, destinations, warehouses, write keys, tracking plans or Protocols, Engage audiences or computed traits, functions, reverse ETL, MTUs or usage, the audit trail, deletion or suppression regulations, or docs.segmentapis.com, and when writing code against the Segment Public API.
license: MIT
compatibility: Requires the segment CLI (npm install -g segment-cli, Node.js 20+), a shell tool, and network access to api.segmentapis.com or eu1.api.segmentapis.com.
allowed-tools: Bash(segment search *) Bash(segment describe *) Bash(segment read *) Bash(segment auth status) Bash(segment auth status *) Bash(segment --help) Bash(segment --version)
---

# Segment Public API via the `segment` CLI

The `segment` CLI wraps all 200 Segment Public API operations, driven by a copy of the official OpenAPI spec, and handles authentication itself. Run it with your shell tool. If `segment` isn't found, `segment --version` is older than 0.3.0, or a command exits with code 3, follow the **segment-setup** skill.

| Command | Network | Use it to |
| --- | --- | --- |
| `segment auth status` | yes | See the logged-in profiles (one per workspace), which is active, and whether the token works |
| `segment search <keywords>` | no | Find the operationId for a task (`segment search tracking plan rules`) |
| `segment describe <operationId>` | no | Get path/query params, body fields (required ones have no `?`), an example body, versions, and a usage line |
| `segment read <operationId> [key=value ...]` | yes | Call any GET operation. `--all` follows pagination; `--fields a,b.c` projects list items |
| `segment write <operationId> [key=value ...] [--body @file.json] --yes` | yes | POST/PUT/PATCH/DELETE. Without `--yes` it only prints a dry run |

Every command takes `--profile NAME` to target a workspace other than the active one, and `--api-version v1|v2|beta|alpha`. The full operation list, grouped by tag, is in [references/operations.md](references/operations.md). Search it when `segment search` misses.

## Workflow

1. If you don't know the operationId, run `segment search`. If you don't know the parameters, run `segment describe`. Never guess body fields: Segment validates strictly and returns 422 with field errors.
2. Resolve names to IDs first. Segment IDs are opaque (for example `qQEHquLrjRDN9j1ByrChyn`). List with a narrow projection, such as `segment read listSources --all --fields id,name,slug,enabled`, then use the ID.
3. Read. For a complete answer, use `--all` with `--fields` so the output stays small. `read` prints JSON to stdout and notes to stderr. When output isn't a terminal and is over about 40 KB, it's saved to a temp file and the summary names the file. Search or read that file, or process it with a short `node -e` script, instead of re-fetching. Pass `--full` when you need to pipe the JSON yourself.
4. Change things with `segment write`, only after following the write rules below.

Parameters are `key=value`. Nested query values use dotted keys (`pagination.count=50`, `groupBy.0=eventName`) or a JSON value (`filter='{"eventName":"x"}'`). For bodies, write the JSON to a temp file and pass `--body @path/to/body.json`. This avoids shell-quoting problems, especially on Windows.

## Write rules

Every `segment write --yes` changes the user's live Segment workspace, and many changes affect production data flow.

- Before running `segment write ... --yes`, show the user the operationId, the target workspace and profile, the target resource (by name and ID), and the exact body. Then wait for an explicit yes. Running the command without `--yes` prints the exact request, including which workspace it would hit, and is a good way to show this.
- Do one logical change per confirmation. Don't chain extra writes the user didn't ask for.
- Treat these as high-impact and spell out the consequence before asking:
  - `delete*` and `remove*` operations. Deleting a source or destination stops data flow and can't be undone from the API.
  - Regulation operations such as `createWorkspaceRegulation` and `createSourceRegulation`. `DELETE_*` types permanently delete end-user data in Segment, and `DELETE_ONLY` / `SUPPRESS_WITH_DELETE` also delete it in downstream destinations.
  - `replaceRulesInTrackingPlan`, which replaces every rule; prefer `updateRulesInTrackingPlan`.
  - Enabling or disabling sources, destinations, or warehouses.
  - IAM changes: users, groups, roles, invites.
- If a write fails because the profile is read-only (exit code 5), tell the user. Don't run `segment auth set --read-write` unless they ask you to.
- After a write, read the resource back to confirm the change.

## Authentication

- The user logs in themselves, in their own terminal: `segment auth login` reads the token at a hidden prompt, verifies it, detects the US or EU region, and stores it in the OS credential store (Windows DPAPI, macOS Keychain, Linux Secret Service). Don't run `segment auth login` yourself. Without an interactive terminal it refuses, and you must never handle the token.
- Never ask the user to paste a token into the chat, and never put a token in a command line, file, or code you write. If they paste one anyway, don't repeat it. Tell them to rotate it in Segment and log in again in their terminal.
- One profile per workspace: `segment auth status` lists them, and `--profile NAME` or `segment auth switch NAME` selects one.
- A token is scoped to one workspace and carries that token's role permissions. A 403 on one resource type usually means the role lacks access, not that the token is broken.

## API behaviour to know

- **Pagination.** List calls get a page size automatically. `--all` follows `data.pagination.next`, up to `--max-pages` (default 20). Some lists cap the page size lower (filters: 10; audiences: 200).
- **Versions.** Operations exist as `v1` (stable), `v1beta`, `v1alpha`, and a few `v2`. By default the CLI calls the most stable version available, and it sends the alpha or beta media type automatically for operations with no stable version. Pass `--api-version alpha|beta|v2` only to reach fields that exist only in that version.
- **Feature gates.** Tracking plans need Protocols, Spaces/Audiences/Computed Traits need Engage/Unify, and Functions need Functions. A 403/404 there often means the workspace lacks the feature. Say so instead of retrying.
- **Rate limits.** The CLI retries 429s, honouring `Retry-After`. Some endpoints have lower limits; event volume, for example, allows 60 requests per minute. Prefer one list call with `--fields` over loops of per-resource calls.
- **Catalog IDs.** Creating a source, destination, or warehouse needs a catalog `metadataId`. Find it with `getSourcesCatalog`, `getDestinationsCatalog`, or `getWarehousesCatalog` (`--all --fields id,name,slug`). Then `getSourceMetadata` / `getDestinationMetadata` shows the settings schema.
- **Write keys** appear in `listSources` only when the token has source-admin permission. Treat them as semi-secret: show them only when asked.
- **Exit codes:** 0 ok, 1 API or network error (details on stderr), 2 usage error, 3 auth problem, 5 refused because the profile is read-only.

## Related skills

- **segment-setup:** install the CLI and get the user logged in.
- **segment-inventory:** map sources → destinations → warehouses and flag problems.
- **segment-usage:** MTU and API-call usage.
- **segment-audit-trail:** who changed what.
- **segment-tracking-plan:** compare analytics calls in code with a tracking plan.

## Writing code against the API

When the user is building their own integration rather than asking you to act:

- Recommend the official SDKs, which are generated from the same spec: npm `@segment/public-api-sdk-typescript`, and the GitHub repos `segmentio/public-api-sdk-go`, `-python`, `-java`, `-csharp`, and `-swift`.
- Use `segment describe` to get the exact request and response shapes. Don't write them from memory.
- Read the token from a secrets manager or environment in the generated code. Base URLs are `https://api.segmentapis.com` (US) and `https://eu1.api.segmentapis.com` (EU), and requests send `Authorization: Bearer <token>`.
