# segment-cli

An unofficial command-line client for the [Twilio Segment Public API](https://docs.segmentapis.com/), plus [agent skills](#agent-skills) that teach coding agents (Claude Code, Codex, Cursor, and others) to use it.

- Covers all 200 Public API operations: sources, destinations, warehouses, tracking plans, Engage, functions, reverse ETL, IAM, usage, audit trail, and deletion/suppression.
- Logs in once per workspace, keeping the token in your OS credential store.
- Runs on Windows, macOS, and Linux, with Node.js 20+ and no other dependencies.

> Not affiliated with or endorsed by Twilio or Segment.

```bash
npm install -g segment-cli
```

```bash
segment auth login
```

```bash
segment read listSources --all --fields id,name,enabled
```

## Log in

```
segment auth login [--profile NAME] [--region us|eu] [--read-only] [--with-token]
```

1. Create a **Public API** token in Segment under **Settings > Access Management > Tokens > Create Token**. Use a Public API token, not a Config API token.
2. Run `segment auth login` in a terminal and paste the token at the hidden prompt.
   - For CI and other non-interactive use, pipe it in: `segment auth login --with-token < token.txt`.
   - In Git Bash on Windows, run `winpty segment auth login`.
3. The CLI verifies the token, detects whether the workspace is in the US or EU region, and stores the token in your OS credential store:

   | OS | Store |
   | --- | --- |
   | Windows | DPAPI, encrypted to your Windows user |
   | macOS | Keychain |
   | Linux | Secret Service (`secret-tool`) |

   If no store is usable, it falls back to an owner-only file and warns you. `--insecure-storage` forces the file.

Tokens are per workspace, so the CLI keeps one **profile** per workspace, named after the workspace slug unless you pass `--profile`:

```
segment auth status                  # list profiles and check the active token
segment auth switch NAME             # change the active profile
segment auth set --read-only         # refuse all writes on this profile (--read-write to undo)
segment auth logout [--profile NAME]
```

Every command accepts `--profile NAME`. Config lives in `%APPDATA%\segment-cli` on Windows and `$XDG_CONFIG_HOME/segment-cli` (default `~/.config/segment-cli`) elsewhere.

## Use

```
segment search [keywords...] [--tag TAG] [--method GET|POST|...]   # find an operation (offline)
segment describe <operationId>                                    # params, body schema, example (offline)
segment read  <operationId> [key=value ...] [--all] [--max-pages N] [--fields a,b.c] [--out FILE] [--full]
segment write <operationId> [key=value ...] [--body JSON|@file|-] [--yes]
```

- **Parameters** are `key=value`. Path and query parameters are routed automatically. Nested query values use dotted keys (`pagination.count=50`, `groupBy.0=eventName`) or a JSON value (`filter='{"eventName":"x"}'`).
- **Pagination:** list calls get a page size automatically. `--all` follows the cursor and merges every page, and `--fields` keeps only the attributes you name.
- **Output:** `read` prints JSON to stdout and messages to stderr. It pretty-prints in a terminal. When piped, it prints compact JSON and saves anything over about 40 KB to a temp file, printing a summary instead. `--full` forces printing and `--out FILE` always saves.
- **Writes:** `write` prints a dry run (the exact request and which workspace it targets) unless you pass `--yes`. Profiles marked read-only refuse writes.
- **Versions:** the CLI calls each operation's most stable version, and sends the alpha or beta media type automatically for operations that have no stable version. `--api-version v1|v2|beta|alpha` overrides this.
- **Rate limits:** 429s are retried, honouring `Retry-After`.

```bash
segment search tracking plan rules
segment describe createSource
segment read listDestinations --all --fields id,name,enabled,sourceId,metadata.name
segment read listAuditEvents startTime=2026-11-01T00:00:00Z --all --max-pages 5
segment read getDailyWorkspaceMTUUsage period=2026-11-01 --all
segment write updateSource sourceId=abc123 --body @patch.json          # dry run
segment write updateSource sourceId=abc123 --body @patch.json --yes    # send
```

| Exit code | Meaning |
| --- | --- |
| 0 | Success (including dry runs) |
| 1 | API or network error; details on stderr |
| 2 | Usage error: unknown operation, bad or missing parameters |
| 3 | Authentication: not logged in, token rejected, no terminal for the login prompt, or the credential store is unreadable |
| 5 | Refused: the profile is read-only |

## Agent skills

[`skills/`](skills) holds [Agent Skills](https://agentskills.io) that teach coding agents how to use the CLI safely. Install them into any supported agent (Claude Code, Codex, Cursor, OpenCode, Gemini CLI, and others) with the [`skills`](https://skills.sh) installer:

```bash
npx skills add csangani/segment-cli
```

Add `-g` for a user-level install, or `--skill segment-api` to pick individual skills.

| Skill | What it does |
| --- | --- |
| `segment-api` | Core know-how: finding operations, reading with pagination and projection, write-safety rules, auth, API quirks |
| `segment-setup` | Installs or checks the CLI and walks the user through `segment auth login` |
| `segment-inventory` | Maps sources → destinations → warehouses, tracking plans, and spaces, and flags problems |
| `segment-usage` | MTU and API-call usage, workspace-wide and per source |
| `segment-audit-trail` | Who changed what, with high-impact changes first |
| `segment-tracking-plan` | Compares `track` / `identify` / ... calls in a codebase with a Protocols tracking plan |

**Claude Code plugin:** the repository is also a Claude Code plugin marketplace, if you prefer plugins:

```
/plugin install segment --marketplace csangani/segment-cli
```

The skills then appear as `/segment:segment-inventory` and so on.

**How the skills keep you safe:**
- The agent never handles your token. You log in yourself, and the skills forbid asking for tokens in chat.
- The skills pre-approve read-only commands (`allowed-tools`) where the agent supports it.
- Writes need an explicit yes from you, with the exact payload shown, before the agent runs `segment write ... --yes`.
- High-impact operations need the consequence spelled out first: deletes, deletion regulations, replacing tracking-plan rules, enable/disable, and IAM changes.

## Development

```bash
node src/cli.mjs --help
```

```bash
npm link
```

```bash
npm test
```

```bash
npm run update-spec
```

- `node src/cli.mjs --help` runs the CLI from the clone.
- `npm link` puts your working copy on PATH as `segment`.
- `npm test` runs end-to-end checks against a mock Segment API with US and EU regions. They cover login and region detection, credential storage, profiles, read-only mode, parameter routing, versions, pagination, 429 retry, projection, large-output files, dry runs, logout, and a check that no token appears in output. CI runs them on Linux, macOS, and Windows, and against a real gnome-keyring on Linux.
- `npm run update-spec` refreshes `spec.json` and `skills/segment-api/references/operations.md` from docs.segmentapis.com.

Validate the Claude Code plugin and marketplace with `claude plugin validate .`.

### Releasing

1. Bump `version` in `package.json`, and in `.claude-plugin/plugin.json` if the skills changed. Commit.
2. Tag and push:

   ```bash
   git tag v0.3.1
   ```

   ```bash
   git push --tags
   ```

   The release workflow runs the tests on all three OSes, checks that the tag matches `package.json`, and publishes to npm with provenance using npm trusted publishing.

Before the first release:
- Publish once by hand with `npm publish --access public`, since trusted publishing can only be configured for an existing package.
- Then add this repository and `release.yml` as a trusted publisher on npmjs.com.

## Notes

- `spec.json` is derived from Segment's published OpenAPI document, with vendor extensions and examples removed. Segment owns that content.
- Layout:
  - `src/` holds the CLI (`cli.mjs` entry point, `api.mjs` requests, `auth.mjs` profiles and credential stores).
  - `skills/` holds the agent skills.
  - `.claude-plugin/` holds the Claude Code plugin and marketplace manifests.
  - `tools/` holds the spec generator and tests.

## License

[MIT](LICENSE)
