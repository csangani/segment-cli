---
name: segment-setup
description: Install the segment CLI (github.com/csangani/segment-cli) if it's missing, guide the user through logging in to their Segment workspace, and verify the token, region, and permissions. Use when `segment` isn't found, is older than 0.3.0, or reports "Not logged in" or a rejected token (exit code 3), or when the user asks to set up or connect Segment.
license: MIT
compatibility: Requires Node.js 20+ with npm, git, a shell tool, and network access to github.com and api.segmentapis.com.
allowed-tools: Bash(segment auth status) Bash(segment auth status *) Bash(segment read getWorkspace*) Bash(segment --version) Bash(node --version) Bash(npm --version) Bash(git --version)
---

# Segment setup

Get the `segment` CLI installed and logged in to the user's Segment workspace.

The token is the user's to handle, not yours. Never ask for it in chat, and never run `segment auth login` yourself. It needs an interactive terminal and refuses otherwise. If the user pastes a token anyway, don't repeat it back or store it. Tell them to rotate it in Segment, because it is now in the conversation history, and to log in with the new one.

## 1. Check the CLI

Run `segment --version`.

- **Prints 0.3.0 or later:** continue to step 2.
- **Not found, or older:** check `node --version` (needs 20 or later), `npm --version`, and `git --version` (npm needs git to install from GitHub). Then offer to install with `npm install -g github:csangani/segment-cli`, and run it only after the user agrees, since it changes their global npm packages. To pin a release, append a tag, for example `github:csangani/segment-cli#v0.3.0`. Running the same command again updates an existing install. If Node or git is missing, point them to https://nodejs.org or https://git-scm.com, or their OS package manager, then stop.

After installing, run `segment --version` again. If the shell still can't find it, npm's global bin directory isn't on PATH. Run `npm prefix -g`: on macOS and Linux the commands live in that directory's `bin/` subfolder; on Windows, in the directory itself. Tell the user how to add it to PATH for their shell.

## 2. Check existing logins

Run `segment auth status`.

- **Exit 0:** report each profile (workspace, region, read-only or read-write, credential store) and confirm the active profile's token is valid. You're done unless the user wants another workspace.
- **Exit 3 with "Not logged in" or a rejected token:** continue to step 3.

## 3. Have the user log in

If they don't have a token yet, explain how to create one:

1. In the Segment app, open the workspace, then **Settings > Access Management > Tokens**.
2. Click **Create Token** and choose a **Public API** token, not a Config API token.
3. Pick the narrowest role that covers what they want the agent to do. A read-only workspace role is enough for inventory, usage, and audit questions. Tokens are per workspace, so each workspace needs its own token and profile.

Then ask them to run this in their own terminal (PowerShell, Windows Terminal, Terminal.app, or any Linux terminal) and paste the token at the hidden prompt:

```
segment auth login
```

Useful options:

- `--profile NAME` names the profile. It defaults to the workspace slug.
- `--read-only` makes this profile refuse all writes.
- `--region us|eu` skips region detection.
- In Git Bash on Windows, use `winpty segment auth login`.
- On a machine without an interactive terminal, use `segment auth login --with-token < token.txt`, then delete the file.

Wait for the user to say they're done.

## 4. Verify

Run `segment auth status`, then `segment read getWorkspace`. Report the workspace name, slug, ID, region, profile, and credential store.

- **401:** the token was wrong, revoked, or a Config API token. Ask the user to log in again with a new one.
- **403/404 on later calls:** the token's role lacks access, or the workspace lacks that feature (Protocols, Engage, Functions).

## 5. Mention the controls

- `segment auth set --read-only` makes a profile refuse all writes. `--read-write` undoes it.
- Even on read-write profiles, you'll ask before each change, and `segment write` only sends with `--yes`.
- `segment auth logout` removes a token from this computer. Revoking it in Segment is separate.
- Try next: a workspace inventory, a usage report, recent changes from the audit trail, or a tracking-plan check. These are the segment-inventory, segment-usage, segment-audit-trail, and segment-tracking-plan skills.
