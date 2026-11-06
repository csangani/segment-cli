## What and why

<!-- What does this change, and what problem does it solve? Link the issue if there is one. -->

## How it was tested

<!-- e.g. new checks in tools/smoke-test.mjs; manual run on Windows/macOS/Linux -->

## Checklist

- [ ] `npm test` and `npm run lint` pass
- [ ] Added or updated checks in `tools/smoke-test.mjs` for behaviour changes
- [ ] Added a line under **Unreleased** in `CHANGELOG.md`
- [ ] Updated the README or the skills if commands, flags, or behaviour changed
- [ ] Skills: `name` matches the folder, only read-only commands in `allowed-tools`, and the safety rules are intact
- [ ] No tokens, write keys, or real workspace data anywhere in the diff
