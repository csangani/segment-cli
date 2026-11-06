# Segment agent skills

Six [Agent Skills](https://agentskills.io) that teach a coding agent (Claude Code, Codex, Cursor, and other agents that support the format) to work with a Twilio Segment workspace through the [`segment` CLI](../README.md).

With them installed, you can ask your agent things like *"which sources have no destinations?"*, *"who disabled the Amplitude destination last week?"*, or *"does our checkout code match the tracking plan?"*. The agent finds the right API call, runs it, and explains the result. It always asks before changing anything.

- [Install](#install)
- [The skills](#the-skills)
- [How the skills keep your workspace safe](#how-the-skills-keep-your-workspace-safe)
- [Customizing](#customizing)

## Install

The skills drive the CLI, so install the CLI and log in first:

```bash
npm install -g csangani/segment-cli
```

```bash
segment auth login
```

Other install options, including GitHub Packages and release tarballs, are in the [main README](../README.md#installation). Your agent can also do the install and walk you through login: install the skills, then ask it to "set up Segment".

### Any agent: the `skills` installer

```bash
npx skills add csangani/segment-cli
```

- Install a single skill with `npx skills add csangani/segment-cli@segment-inventory`.
- Add `-g` to install for your user instead of the current project.
- The installer detects which agents you use and puts the skills where each one expects them. Run `npx skills update` to pull new versions later.

### Claude Code: as a plugin

```
/plugin install segment --marketplace csangani/segment-cli
```

The skills then also work as slash commands, such as `/segment:segment-inventory`.

### Manually

Each skill is a self-contained folder. Copy the ones you want into your agent's skills directory. For Claude Code, that's `~/.claude/skills/` for your user or `.claude/skills/` for a project:

```bash
git clone https://github.com/csangani/segment-cli
cp -r segment-cli/skills/segment-* ~/.claude/skills/
```

## The skills

### `segment-api`: the core skill

Everything an agent needs to use the CLI well. It loads whenever Segment comes up: sources, destinations, warehouses, tracking plans, Engage, functions, reverse ETL, IAM, usage, the audit trail, regulations, or writing code against the Public API.

- **Finds the right call:** it uses `segment search` and `segment describe` instead of guessing, and resolves names to Segment's opaque IDs before acting.
- **Reads efficiently:** it combines `--all` with `--fields`, and works from saved files for large responses.
- **Changes things only with your explicit approval.** See [the safety rules](#how-the-skills-keep-your-workspace-safe).
- **Knows the API's quirks:** pagination limits, alpha and beta operations, feature-gated areas, rate limits, catalog `metadataId`s, and the regions.
- **Helps you write code** against the API with the official SDKs, using exact request shapes from the spec.

> "Disable the staging Amplitude destination." · "What settings does the Mixpanel destination accept?" · "Add a label to every iOS source."

### `segment-setup`

Gets you from nothing to a working, verified connection:

1. Checks for Node.js, npm, git, and the CLI, and offers to install the CLI.
2. Explains how to create a Public API token with the narrowest role you need.
3. Has **you** run `segment auth login` in your own terminal. The agent never handles the token.
4. Verifies the workspace, region, and credential store, and explains read-only mode.

> "Set up Segment." · "Connect my Segment workspace." · It also loads automatically when the CLI is missing or not logged in.

### `segment-inventory`

Builds a read-only map of the workspace: sources → destinations → warehouses, plus tracking plans and Engage spaces. Then it flags problems:

- enabled sources whose data goes nowhere,
- disabled sources that still have enabled destinations,
- disabled and orphaned destinations,
- likely duplicate destinations,
- live tracking plans and how stale they are.

It can save the report as `segment-inventory.md`.

> "Give me an overview of our Segment workspace." · "Where does the web source's data go?" · "Audit our Segment setup."

### `segment-usage`

Month-to-date **MTUs** (identified vs anonymous) and **API calls**, both workspace-wide and per source. It shows growth over the month, the top 10 sources by each measure, and anomalies such as anonymous-heavy sources or sudden jumps.

> "Which sources drive our MTUs this month?" · "How did October's usage break down?"

### `segment-audit-trail`

Summarizes the audit trail for a time window, a resource, or a resource type. High-impact changes come first: deletions, disables, IAM and token changes, regulations, and tracking-plan edits. The rest is grouped by resource with timestamps and who made each change, and bursts of activity or changes made by API tokens are called out.

> "What changed in Segment this week?" · "Who disabled the iOS source?"

### `segment-tracking-plan`

Compares the analytics calls in your codebase with a Protocols tracking plan. It covers `track`, `identify`, `page`, `group`, and `screen` across analytics.js, Node, Python, the mobile SDKs, Typewriter, and custom wrappers. It reports:

1. events your code sends that aren't in the plan,
2. required properties that are missing, and properties the schema disallows,
3. planned events that this code never sends,
4. deprecated events that are still being sent,
5. dynamic event names it couldn't resolve.

It can also export the plan to a JSON file.

> "Does our checkout code match the tracking plan?" · "Export our live tracking plan."

## How the skills keep your workspace safe

- **The agent never sees your token.** You log in yourself, in your own terminal. The skills forbid asking for a token in chat, and the CLI refuses to log in without an interactive terminal.
- **Reads are pre-approved; writes are not.** Each skill's `allowed-tools` pre-approves only read-only commands (`segment read`, `search`, `describe`, `auth status`), in agents that honour it. Every `segment write` still goes through your agent's normal approval prompt.
- **Every change is confirmed in chat first.** Before running `segment write … --yes`, the agent must show you the operation, the target workspace and resource, and the exact payload, and wait for your yes. It makes one change per confirmation, then reads the result back.
- **High-impact changes are explained before you're asked.** These are deletes, deletion and suppression regulations (which can erase end-user data downstream), replacing a whole tracking plan, enabling or disabling sources and destinations, and IAM changes.
- **Read-only profiles are enforced by the CLI** (`segment auth set --read-only`), whatever the agent does.

## Customizing

Skills are plain Markdown with YAML frontmatter, so fork the repository and edit freely. For example, you can:

- add your team's naming conventions to `segment-api`,
- teach `segment-tracking-plan` about your analytics wrapper,
- add a skill for a workflow you repeat.

Each skill's `name` must match its folder name. Keep `description` specific about when the skill should be used, because that's what agents match on. `skills/segment-api/references/operations.md` is generated by `npm run update-spec`, so don't edit it by hand.
