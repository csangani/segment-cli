# Contributing to segment-cli

Thanks for helping out! Bug reports, fixes, new recipes, and skill improvements are all welcome.

## Ground rules

- Be kind. This project follows the [Code of Conduct](CODE_OF_CONDUCT.md).
- **Never paste a Segment token, write key, or workspace data** into an issue, a PR, or test fixture. Redact IDs if they're sensitive.
- Report security problems privately. See [SECURITY.md](SECURITY.md).
- For anything bigger than a small fix, open an issue first so we can agree on the approach.

## Development setup

You need Node.js 20+ and git.

```bash
git clone https://github.com/csangani/segment-cli && cd segment-cli
npm link        # `segment` on your PATH now runs your working copy
npm test        # end-to-end tests against a mock Segment API
```

`npm test` runs [`tools/smoke-test.mjs`](tools/smoke-test.mjs). It:

- starts a local mock of the Segment API with US and EU regions,
- drives the real CLI as a subprocess, with an isolated config directory,
- uses your OS credential store, but only for throwaway test profiles that it removes again.

It needs no network access and no Segment account.

## Project layout

| Path | What it is |
| --- | --- |
| `src/cli.mjs` | Commands, argument parsing, and output |
| `src/api.mjs` | Spec lookup, request building, HTTP, pagination, projection |
| `src/auth.mjs` | Profiles, OS credential stores, the hidden prompt |
| `spec.json` | Trimmed Segment OpenAPI spec. **Generated; don't edit by hand** |
| `skills/` | Agent skills, one folder per skill |
| `skills/segment-api/references/operations.md` | Operation index. **Generated** |
| `.claude-plugin/` | Claude Code plugin and marketplace manifests |
| `tools/update-spec.mjs` | Regenerates the two generated files |
| `tools/smoke-test.mjs` | End-to-end tests |

## Guidelines

### Code

- **No runtime dependencies.** The CLI uses Node built-ins only (`fetch`, `child_process`, `fs`). Install time stays near zero, and there's no supply chain to audit. If you think a dependency is essential, open an issue first.
- **ES modules, Node 20+**, and the style of the surrounding code: 2-space indent, double quotes, small functions.
- **Keep stdout clean:** JSON goes to stdout, while progress, hints, and errors go to stderr.
- **Use `UserError(message, exitCode)` for expected failures**, with an actionable message. The exit codes are documented in the README and are part of the interface, so don't change their meaning.
- **Never print, log, or put a token in a command line.** Pass secrets to child processes on stdin. Tests check that tokens never appear in output.
- **Cross-platform:**
  - Anything OS-specific needs a fallback, and a test that runs in CI on Linux, macOS, and Windows.
  - Avoid shell-specific behaviour.
  - Remember that Windows users run PowerShell, cmd, and Git Bash.

### Tests

Add or update a check in `tools/smoke-test.mjs` for every behaviour change. Extend the mock server when you need a new endpoint shape. CI must pass on all three operating systems before merging.

### Skills

Skills follow the [Agent Skills specification](https://agentskills.io):

- `name` must match the folder name (lowercase, hyphens).
- Frontmatter uses only `name`, `description`, `license`, `compatibility`, `allowed-tools`, and `metadata`.
- `description` says what the skill does **and when to use it**. Agents match on it, so be specific.
- Write for any agent: say "your shell tool", not a specific product's tool names.
- Keep the safety rules intact: agents never handle tokens, and writes need explicit user confirmation.
- Only read-only commands belong in `allowed-tools`.
- Keep each `SKILL.md` under 500 lines, and move long reference material into a `references/` file.

If you have the Claude Code CLI, check the plugin manifests with `claude plugin validate .`.

### Updating the API spec

When Segment ships API changes:

```bash
npm run update-spec
npm test
```

Commit `spec.json` and `operations.md` together, and note the new spec version in the changelog.

## Pull requests

1. Fork the repository and create a branch from `main`.
2. Make your change, with tests.
3. Add a line under **Unreleased** in [CHANGELOG.md](CHANGELOG.md).
4. Run `npm test`.
5. Open the PR and fill in the template.

Small, focused PRs are easiest to review.

## Releases

Maintainers release by bumping `version` in `package.json` (and in `.claude-plugin/plugin.json` when skills change), moving the **Unreleased** changelog entries under the new version, and pushing a `vX.Y.Z` tag. The release workflow tests everything again and publishes a GitHub Release with the installable tarball.
