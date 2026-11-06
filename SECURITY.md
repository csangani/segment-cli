# Security Policy

segment-cli handles Segment API tokens, which can read and change production data pipelines. Security reports are taken seriously.

## Supported versions

Security fixes go into the latest release. Please reproduce issues on the [latest release](https://github.com/csangani/segment-cli/releases/latest) or on `main` before reporting.

## Reporting a vulnerability

**Please don't open a public issue for security problems.**

Report privately through GitHub: go to the repository's **Security** tab and choose **[Report a vulnerability](https://github.com/csangani/segment-cli/security/advisories/new)**. Please include:

- what the problem is and its impact,
- steps to reproduce, ideally with the mock server in `tools/smoke-test.mjs` rather than a real workspace,
- your OS, Node.js version, shell, and `segment --version`.

**Never include a real token** in the report. If you think a token has been exposed, revoke it in Segment (**Settings > Access Management > Tokens**) right away.

Reports are handled on a best-effort basis. You'll get an acknowledgement, a fix or mitigation will be coordinated with you, and the advisory will be published with credit, unless you'd rather stay anonymous.

## Scope

In scope:

- Token exposure: a token printed, logged, written in plaintext when an OS credential store was available, or passed on a command line.
- Weaknesses in the credential-store integrations (Windows DPAPI, macOS Keychain, Linux Secret Service) or the file fallback's permissions.
- Command or argument injection through anything the CLI passes to child processes.
- Ways to make `write` send a request without `--yes`, or bypass a read-only profile.
- Weaknesses in the agent skills that could lead an agent to handle tokens or make unconfirmed changes.

Out of scope:

- Vulnerabilities in the Segment API itself. Report those to [Twilio](https://www.twilio.com/en-us/security).
- Issues that need an already-compromised user account or machine.
