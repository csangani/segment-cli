# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.1] - 2026-11-06

### Fixed

- **`--fields` returned `{}` for every item in PowerShell.** npm's PowerShell shim (`segment.ps1`) passes an unquoted `--fields a,b,c` as the single argument `"a b c"`. `--fields` now accepts commas, spaces, or both.
- **A `--fields` entry that matches nothing** now prints a warning on stderr listing the available fields, instead of silently returning empty objects.

### Changed

- The docs, skills, and release checks use npm's shorter GitHub install form, `npm install -g csangani/segment-cli`.
- The README and the `segment-api` skill explain quoting comma-containing values in PowerShell.

## [0.4.0] - 2026-11-06

### Changed

- **The package is now named `@csangani/segment-cli`.** If you installed 0.3.0, run `npm uninstall -g segment-cli` before installing 0.4.0, because both provide the `segment` command. The command and its behaviour are unchanged.
- `spec.json` no longer contains a generation timestamp, so regenerating an unchanged spec produces an identical file.

### Added

- **GitHub Packages:** releases are published there as `@csangani/segment-cli`, alongside the GitHub Release tarball.
- **Release checks:** each release is install-tested on Linux, macOS, and Windows from all three sources: GitHub Packages, the git tag, and the release tarball.
- **`npm run lint`**, also run in CI, checks:
  - script syntax,
  - the Agent Skills spec,
  - manifests and version consistency,
  - generated files,
  - Markdown links.
- **Spec check:** a weekly workflow opens an issue when Segment publishes a new Public API spec.
- **Branch protection:** `main` only changes through pull requests that pass CI, and release tags can't be moved or deleted.

## [0.3.0] - 2026-11-06

First public release.

### Added

- **CLI** for all 200 Segment Public API operations, generated from Segment's OpenAPI spec v74.0.1.
  - `search` and `describe` work offline from the bundled spec.
  - `read` adds pagination (`--all`, `--max-pages`), field projection (`--fields`), and large-output handling (`--out`, `--full`).
  - `write` is a dry run unless `--yes` is given.
  - Path and query parameters are routed automatically, including dotted and JSON-valued query parameters.
  - Operations that exist only in alpha or beta get the right media type automatically, and `--api-version` overrides it.
  - 429 responses are retried, honouring `Retry-After`.
- **Authentication** with `segment auth login | status | switch | set | logout`.
  - The token is read at a hidden terminal prompt or from stdin (`--with-token`).
  - Login verifies the token and detects the US or EU region.
  - Tokens are stored in Windows DPAPI, macOS Keychain, or Linux Secret Service, with an owner-only file as fallback.
  - One profile per workspace, with an optional read-only mode.
- **Agent skills**, installable with `npx skills add csangani/segment-cli`: `segment-api`, `segment-setup`, `segment-inventory`, `segment-usage`, `segment-audit-trail`, and `segment-tracking-plan`.
- **Claude Code plugin** and marketplace manifests for the same skills.
- **CI:** end-to-end tests on Linux, macOS, and Windows, including a real GNOME Keyring.
- **Releases:** a GitHub Release with an installable tarball for each `v*` tag.

[Unreleased]: https://github.com/csangani/segment-cli/compare/v0.4.1...HEAD
[0.4.1]: https://github.com/csangani/segment-cli/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/csangani/segment-cli/releases/tag/v0.4.0
[0.3.0]: https://github.com/csangani/segment-cli/releases/tag/v0.3.0
