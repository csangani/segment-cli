# segment-cli

[![CI](https://github.com/csangani/segment-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/csangani/segment-cli/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/csangani/segment-cli)](https://github.com/csangani/segment-cli/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Node.js 20+](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)
![Windows | macOS | Linux](https://img.shields.io/badge/platform-windows%20%7C%20macos%20%7C%20linux-lightgrey.svg)

**A command-line client for the [Twilio Segment Public API](https://docs.segmentapis.com/), and [agent skills](skills/README.md) that let coding agents use it safely.**

```console
$ segment read listSources --all --fields name,enabled,metadata.name
{"data":{"sources":[{"name":"iOS app","enabled":true,"metadata.name":"iOS"},…]}}
```

- **The whole API.** All 200 operations: sources, destinations, warehouses, tracking plans, Engage audiences and computed traits, functions, reverse ETL, IAM, usage, event volume, the audit trail, and deletion/suppression regulations. They're generated from Segment's own OpenAPI spec.
- **Log in once.** Tokens live in your OS credential store (Windows DPAPI, macOS Keychain, Linux Secret Service), never in environment variables or shell history. One profile per workspace, US and EU regions detected automatically, and an optional read-only mode.
- **Built for scripts and agents.** JSON on stdout, messages on stderr, meaningful exit codes, automatic pagination and field projection. Writes are dry runs until you add `--yes`.
- **Runs everywhere.** Windows, macOS, and Linux, on Node.js 20+, with no dependencies.

> Unofficial. Not affiliated with or endorsed by Twilio or Segment.

## Contents

- [Quick start](#quick-start)
- [Installation](#installation)
- [Authentication](#authentication)
- [Usage](#usage)
- [Recipes](#recipes)
- [Agent skills](#agent-skills)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Quick start

1. Install:

   ```bash
   npm install -g csangani/segment-cli
   ```

2. Log in. Paste a Segment Public API token at the hidden prompt:

   ```bash
   segment auth login
   ```

3. Explore:

   ```bash
   segment search destinations
   segment read listDestinations --all --fields name,enabled,metadata.name
   ```

Don't have a token? In the Segment app, go to **Settings > Access Management > Tokens > Create Token** and choose **Public API** (not Config API).

## Installation

Requires [Node.js](https://nodejs.org) 20 or later. Every release is published in three places, and each is install-tested on Linux, macOS, and Windows:

| Source | Needs | Best for |
| --- | --- | --- |
| [From GitHub](#from-github-recommended) | git | Most people: no account or token needed |
| [Release tarball](#from-a-release-tarball) | nothing extra | Machines without git |
| [GitHub Packages](#from-github-packages) | a GitHub token | Teams that already use GitHub's npm registry |

### From GitHub (recommended)

```bash
npm install -g csangani/segment-cli          # latest
npm install -g csangani/segment-cli#v0.4.1   # a specific release
npx csangani/segment-cli --help              # run once without installing
```

npm reads `csangani/segment-cli`, with no `@`, as this GitHub repository. Don't confuse it with `@csangani/segment-cli`, which is the [GitHub Packages](#from-github-packages) name. To update, run the install command again.

### From a release tarball

Each [release](https://github.com/csangani/segment-cli/releases) includes the npm package as a file, which npm can install directly:

```bash
npm install -g https://github.com/csangani/segment-cli/releases/download/v0.4.1/csangani-segment-cli-0.4.1.tgz
```

### From GitHub Packages

Releases are also published to GitHub's npm registry as [`@csangani/segment-cli`](https://github.com/csangani/segment-cli/pkgs/npm/segment-cli). **GitHub Packages requires authentication even for public packages**, so you need a GitHub personal access token (classic) with the `read:packages` scope. Do this once:

```bash
npm config set @csangani:registry https://npm.pkg.github.com
npm login --scope=@csangani --auth-type=legacy --registry=https://npm.pkg.github.com
```

At the prompts, enter your GitHub username, and the token as the password. Then install, and update later, with:

```bash
npm install -g @csangani/segment-cli
npm update -g @csangani/segment-cli
```

### Check, uninstall, and PATH

```bash
segment --version
npm uninstall -g @csangani/segment-cli
```

- **Upgrading from 0.3.0?** That release was named `segment-cli`. Run `npm uninstall -g segment-cli` first.
- **Shell can't find `segment`?** npm's global folder isn't on your `PATH`. Run `npm prefix -g`: on Windows, add that folder to `PATH`; on macOS and Linux, add its `bin` subfolder.

## Authentication

### Log in

```
segment auth login [--profile NAME] [--region us|eu] [--read-only] [--with-token] [--insecure-storage]
```

`segment auth login` reads the token at a hidden prompt. It then:

1. **Verifies the token** with Segment and finds its workspace.
2. **Detects the region.** It tries US (`api.segmentapis.com`), then EU (`eu1.api.segmentapis.com`). Pass `--region` to skip this.
3. **Stores the token** in your OS credential store:

   | OS | Where the token goes |
   | --- | --- |
   | Windows | DPAPI, encrypted to your Windows user account |
   | macOS | Keychain (service `segment-cli`) |
   | Linux | Secret Service via `secret-tool` (GNOME Keyring, KWallet, …) |
   | Anywhere else, or if the store is unavailable | An owner-only file, with a warning |

   `--insecure-storage` forces the file. That's useful on CI runners, which have no keyring.
4. **Saves a profile** named after the workspace slug and makes it active.

Login needs an interactive terminal: PowerShell, Windows Terminal, Terminal.app, or any Linux terminal. In Git Bash on Windows, run `winpty segment auth login`. For scripts and CI, pipe the token in:

```bash
segment auth login --with-token < token.txt
```

### Profiles

A Segment token belongs to one workspace, so the CLI keeps one profile per workspace:

```bash
segment auth status                         # list profiles; checks the active token with Segment
segment auth switch acme-staging            # change the active profile
segment read listSources --profile acme-prod    # use another profile for one command
segment auth set --read-only                # this profile now refuses every write
segment auth set --read-write               # …and this undoes it
segment auth logout --profile acme-staging  # remove a profile and its stored token
```

`logout` deletes the token from your computer only. Revoke it in Segment if you no longer need it.

Settings live in `%APPDATA%\segment-cli` on Windows and `$XDG_CONFIG_HOME/segment-cli` (default `~/.config/segment-cli`) on macOS and Linux.

## Usage

```
segment search [keywords...] [--tag TAG] [--method GET|POST|PUT|PATCH|DELETE] [--limit N]
segment describe <operationId> [--depth N]
segment read  <operationId> [key=value ...] [--all] [--max-pages N] [--fields a,b.c] [--out FILE] [--full]
segment write <operationId> [key=value ...] [--body JSON | --body @file.json | --body -] [--yes]
```

| Command | What it does |
| --- | --- |
| `search` | Finds operations by keyword, offline. With no arguments, lists every API area (tag) with its operation count. |
| `describe` | Shows an operation's parameters, request body fields (required ones have no `?`), an example body, its versions, and a ready-to-edit usage line. Offline. |
| `read` | Calls a GET operation and prints the JSON response. |
| `write` | Calls a POST, PUT, PATCH, or DELETE operation. **Without `--yes` it only prints the request it would send.** |

Every command accepts `--profile NAME` and `--api-version v1|v2|beta|alpha`.

### Parameters

Path and query parameters are both written `key=value`, and the CLI routes each to the right place. Nested query values use dotted keys or JSON:

```bash
segment read getSource sourceId=qQEHquLrjRDN9j1ByrChyn
segment read listAuditEvents startTime=2026-11-01T00:00:00Z resourceType=SOURCE
segment read getEventsVolumeFromWorkspace granularity=DAY startTime=2026-11-01T00:00:00Z endTime=2026-11-06T00:00:00Z groupBy.0=eventName
```

**In PowerShell, quote any value that contains a comma or JSON**, for example `filter.eventName="Signed Up,Order Completed"`. PowerShell otherwise splits it into an array before the CLI sees it. `--fields` is the exception: it accepts commas or spaces, so `--fields id,name` works unquoted.

Request bodies are JSON, inline or from a file (`@file.json`) or stdin (`-`). Files avoid shell-quoting trouble, especially on Windows.

### Pagination and projection

- **Page size:** list operations get one automatically.
- **`--all`:** follows the cursor and merges every page into one array, up to `--max-pages` (default 20, max 100).
- **`--fields`:** keeps only the attributes you list, including nested ones such as `metadata.name`.

Together they turn large responses into compact tables:

```bash
segment read listDestinations --all --fields id,name,enabled,sourceId,metadata.name
```

### Output

- JSON goes to **stdout**, while progress and hints go to **stderr**.
- In a terminal, JSON is pretty-printed. When piped, it's compact.
- When piped output is larger than about 40 KB, the CLI saves it to a temp file and prints a short summary instead, so an agent's context doesn't overflow.
- Add `--full` to always print everything (for example when piping to `jq`), or `--out FILE` to always save to a file.

### Versions, retries, and limits

- **Versions:** each operation uses its most stable version by default. Operations that only exist in alpha or beta get the right media type automatically. Use `--api-version` to opt into alpha or beta fields.
- **Rate limits:** 429 responses are retried, honouring Segment's `Retry-After`.
- **Server errors:** transient errors on reads are retried.

### Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success, including dry runs |
| `1` | The API returned an error, or the network failed. Details are on stderr. |
| `2` | Usage error: unknown operation, missing or unknown parameter, invalid JSON |
| `3` | Authentication: not logged in, token rejected, no terminal for the login prompt, or credential store unreadable |
| `5` | Refused: the profile is read-only |

## Recipes

**Where does a source's data go?**

```bash
segment read listSources --all --fields id,name
segment read listConnectedDestinationsFromSource sourceId=<id> --all --fields name,enabled,metadata.name
```

**What changed in the workspace this week, and who did it?**

```bash
segment read listAuditEvents startTime=2026-10-30T00:00:00Z --all \
  --fields timestamp,type,actorEmail,resourceType,resourceName
```

**Month-to-date MTUs.** The rows are cumulative, so the last one is the total so far:

```bash
segment read getDailyWorkspaceMTUUsage period=2026-11-01 --all
```

**Which events are busiest?**

```bash
segment read getEventsVolumeFromWorkspace granularity=DAY groupBy.0=eventName \
  startTime=2026-11-01T00:00:00Z endTime=2026-11-06T00:00:00Z
```

**Disable a destination, safely.** The first command only shows what would be sent:

```bash
echo '{"enabled": false}' > disable.json
segment write updateDestination destinationId=<id> --body @disable.json
segment write updateDestination destinationId=<id> --body @disable.json --yes
```

**Back up a tracking plan:**

```bash
segment read listTrackingPlans --all --fields id,name,type
segment read listRulesFromTrackingPlan trackingPlanId=<id> --all --out tracking-plan.json
```

**Find a catalog ID** before creating a destination:

```bash
segment read getDestinationsCatalog --all --fields id,name --full \
  | jq -r '.data.destinationsCatalog[] | select(.name | test("Amplitude")) | "\(.id)\t\(.name)"'
segment describe createDestination
```

**Check pending deletion requests:**

```bash
segment read listWorkspaceRegulations status=RUNNING --all
```

**Use in CI.** For example, a GitHub Actions step with the token in a repository secret:

```bash
printf '%s' "$SEGMENT_TOKEN" | segment auth login --with-token --insecure-storage --read-only
segment read listSources --all --fields name,enabled --full > sources.json
```

## Agent skills

[`skills/`](skills/README.md) contains [Agent Skills](https://agentskills.io): plain-markdown instructions that teach a coding agent (Claude Code, Codex, Cursor, and others) to drive this CLI well, and safely. Install all of them with the [`skills`](https://skills.sh) installer:

```bash
npx skills add csangani/segment-cli
```

| Skill | Ask your agent… |
| --- | --- |
| [`segment-api`](skills/segment-api/SKILL.md) | "Disable the staging Amplitude destination" · "What settings does the Mixpanel destination have?" |
| [`segment-setup`](skills/segment-setup/SKILL.md) | "Set up Segment" (installs and checks the CLI, then guides you through login) |
| [`segment-inventory`](skills/segment-inventory/SKILL.md) | "Give me an overview of our Segment workspace" |
| [`segment-usage`](skills/segment-usage/SKILL.md) | "Which sources drive our MTUs this month?" |
| [`segment-audit-trail`](skills/segment-audit-trail/SKILL.md) | "Who changed the iOS source last week?" |
| [`segment-tracking-plan`](skills/segment-tracking-plan/SKILL.md) | "Does our checkout code match the tracking plan?" |

Claude Code users can install the same skills as a plugin instead:

```
/plugin install segment --marketplace csangani/segment-cli
```

See **[skills/README.md](skills/README.md)** for per-skill details, manual installation, and how the skills keep your workspace safe.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `segment: command not found` | npm's global folder isn't on `PATH`; see [Installation](#installation). |
| `needs an interactive terminal` | Run `segment auth login` in a real terminal (in Git Bash on Windows, use `winpty segment auth login`), or use `--with-token`. |
| `Segment rejected this token in both the US and EU regions` | It's a Config API token, a source write key, or a revoked token. Create a **Public API** token. |
| `401` on a command that used to work | The token was revoked or rotated. Run `segment auth login` again. |
| `403` / `404` on tracking plans, spaces, audiences, or functions | The workspace lacks Protocols, Engage, or Functions, or the token's role doesn't cover it. |
| `Warning: no OS credential store was usable` | On Linux, install `secret-tool` (package `libsecret-tools`) and run a keyring such as GNOME Keyring, or accept the owner-only file. |
| `Profile "…" is read-only` (exit 5) | Intended. Run `segment auth set --read-write` if you want writes. |
| `--fields` returns `{}` for every item | You're on 0.4.0 in PowerShell; update to 0.4.1. A field name with a typo now prints a warning listing the real fields. |
| A `key=value` containing commas or JSON is ignored or mangled in PowerShell | Quote the value: `filter.eventName="a,b"`. |
| Output says `Saved … KB to …` | The response was large and stdout wasn't a terminal. Add `--full` to print it, or read the file. |

## Security

- **Tokens:** they are read only from a hidden prompt or stdin, never from arguments or environment variables. They're stored in the OS credential store, and never printed, logged, or written into any output.
- **Writes:** every write is a dry run unless `--yes` is given, and the dry run names the workspace it would change. Read-only profiles refuse writes outright.
- **Data:** the CLI talks only to `api.segmentapis.com` or `eu1.api.segmentapis.com`.
- **Spec and dependencies:** the bundled API spec makes `search` and `describe` work offline. There are no runtime dependencies to audit.

## Development

```bash
git clone https://github.com/csangani/segment-cli && cd segment-cli
npm link                 # put your working copy on PATH as `segment`
npm test                 # end-to-end tests against a mock Segment API
npm run lint             # syntax, skills spec, manifests, versions, Markdown links
npm run update-spec      # refresh spec.json from docs.segmentapis.com
```

- **`npm test`** starts a mock Segment API with US and EU regions and drives the real CLI through about 40 checks. They cover login and region detection, credential storage, profiles, read-only mode, parameter routing, versions, pagination, 429 retries, field projection, large output, dry runs, and logout. They also check that no token ever appears in output.
- **`npm run lint`** checks, offline:
  - that every script parses,
  - that skills meet the [Agent Skills spec](https://agentskills.io) and pre-approve only read-only commands,
  - that the package, plugin, and changelog versions agree,
  - that the generated files are in sync,
  - that every relative Markdown link and anchor resolves.
- **[CI](.github/workflows/ci.yml)** runs on every push and pull request:
  - the lint job,
  - the tests on Linux, macOS, and Windows with Node 22 and 24,
  - a Linux job against a real GNOME Keyring.

  The single **CI passed** check gates merges.
- **[Spec check](.github/workflows/spec-check.yml)** runs weekly and opens an issue when Segment publishes a new Public API spec.
- **Plugin checks:** `claude plugin validate .` checks the Claude Code plugin manifests.

```
src/cli.mjs        commands and argument parsing
src/api.mjs        spec lookup, request building, HTTP, pagination, output shaping
src/auth.mjs       profiles, credential stores, hidden prompt
spec.json          trimmed Segment OpenAPI spec (generated)
skills/            agent skills
.claude-plugin/    Claude Code plugin and marketplace manifests
tools/             spec generator, lint, and end-to-end tests
```

### Releasing

`main` is protected: changes land through pull requests, which need the **CI passed** check and resolved review threads, and are squash-merged. Release tags (`v*`) can't be moved or deleted once pushed.

1. In a pull request, bump `version` in `package.json` and `.claude-plugin/plugin.json`, and move the **Unreleased** changelog entries under the new version. Merge it.
2. Tag the merged commit on `main` and push the tag:

   ```bash
   git tag v0.4.1
   git push origin v0.4.1
   ```

   The [release workflow](.github/workflows/release.yml) then:
   - reruns the full test matrix,
   - checks the tag against `package.json` and the changelog,
   - publishes `@csangani/segment-cli` to GitHub Packages,
   - creates a GitHub Release with the tarball and the changelog notes,
   - installs the result from all three sources on Linux, macOS, and Windows.

The package is published to GitHub Packages only, not to the public npm registry. Release history is in the [changelog](CHANGELOG.md).

## Contributing

Issues and pull requests are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers setup, tests, and the guidelines for code and skills. Please follow the [Code of Conduct](CODE_OF_CONDUCT.md), and report security issues privately as described in [SECURITY.md](SECURITY.md). Never post tokens or workspace data in issues.

## License

[MIT](LICENSE) © Chirag Sangani. The bundled `spec.json` is derived from Segment's published OpenAPI document; Segment owns that content.
