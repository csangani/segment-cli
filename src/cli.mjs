#!/usr/bin/env node
// segment: a command-line client for the Segment Public API. Zero dependencies, Node 18+.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SPEC, CLI_VERSION, UserError, findOp, searchOps, opLine, describeOp, listTags, buildRequest, urlFor, mediaType, send, errorText, listKey, project, parseFields, unmatchedFields } from "./api.mjs";
import { configDir, loadConfig, saveConfig, storeToken, loadToken, removeToken, readStdin, promptHidden, BACKENDS } from "./auth.mjs";

const MAX_INLINE = 40000;
const out = (s) => process.stdout.write(s.endsWith("\n") ? s : s + "\n");
const info = (s) => process.stderr.write(s + "\n");

const HELP = `segment ${CLI_VERSION}: command-line client for the Segment Public API (spec v${SPEC.version})

Usage
  segment auth login [--profile NAME] [--region us|eu] [--read-only] [--with-token] [--insecure-storage]
  segment auth status [--profile NAME] [--offline]
  segment auth switch NAME
  segment auth set [--profile NAME] [--read-only | --read-write] [--region us|eu]
  segment auth logout [--profile NAME]

  segment search [keywords...] [--tag TAG] [--method GET|POST|...] [--limit N]
  segment describe <operationId> [--depth N]
  segment read  <operationId> [key=value ...] [--all] [--max-pages N] [--fields a,b.c] [--out FILE] [--full]
  segment write <operationId> [key=value ...] [--body JSON|@file|-] [--yes]

Common flags
  --profile NAME       use a profile other than the active one (one profile per workspace token)
  --api-version V      force v1, v2, beta or alpha (default: most stable available)

Notes
  • Parameters are key=value. Nested query values use dotted keys (pagination.count=50) or JSON (filter='{"a":1}').
  • read prints JSON to stdout and messages to stderr. Large output is saved to a file unless --full or --out is given.
  • write only previews the request unless --yes is given.
  • Tokens are kept in the OS credential store (Windows DPAPI, macOS Keychain, Linux Secret Service).

Examples
  segment auth login
  segment search tracking plan rules
  segment read listSources --all --fields id,name,enabled
  segment read listAuditEvents startTime=2026-11-01T00:00:00Z --all
  segment write updateSource sourceId=abc --body '{"enabled":false}' --yes
`;

// ---------------------------------------------------------------------------
// Arguments

const BOOLEAN_FLAGS = new Set(["all", "yes", "full", "read-only", "read-write", "with-token", "offline", "insecure-storage", "help", "version"]);

function parseArgs(argv) {
  const positionals = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--") {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (a === "-h") flags.help = true;
    else if (a === "-v") flags.version = true;
    else if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      const name = eq > 0 ? a.slice(2, eq) : a.slice(2);
      if (eq > 0) flags[name] = a.slice(eq + 1);
      else if (BOOLEAN_FLAGS.has(name)) flags[name] = true;
      else {
        if (i + 1 >= argv.length) throw new UserError(`--${name} needs a value.`);
        flags[name] = argv[++i];
      }
    } else positionals.push(a);
  }
  return { positionals, flags };
}

function parseParams(args) {
  const params = {};
  for (const a of args) {
    const eq = a.indexOf("=");
    if (eq <= 0) throw new UserError(`Expected key=value, got "${a}". Run \`segment describe <operationId>\` to see parameters.`);
    const key = a.slice(0, eq);
    let value = a.slice(eq + 1);
    if (/^\s*[[{]/.test(value)) {
      try {
        value = JSON.parse(value);
      } catch (e) {
        throw new UserError(`Value for ${key} looks like JSON but does not parse: ${e.message}`);
      }
    }
    params[key] = value;
  }
  return params;
}

async function parseBody(spec) {
  if (spec === undefined) return undefined;
  let text = spec;
  if (spec === "-") text = await readStdin();
  else if (spec.startsWith("@")) {
    try {
      text = fs.readFileSync(spec.slice(1), "utf8");
    } catch (e) {
      throw new UserError(`Could not read body file ${spec.slice(1)}: ${e.message}`);
    }
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new UserError(`--body is not valid JSON: ${e.message}. Tip: write the JSON to a file and pass --body @file.json.`);
  }
}

// ---------------------------------------------------------------------------
// Profiles

const regionOf = (r) => (String(r).toLowerCase().startsWith("eu") ? "eu" : "us");
const baseFor = (region, override) => (override ? override.replace("{region}", region) : SPEC.servers[region]).replace(/\/+$/, "");

function selectProfile(flags, { required = true } = {}) {
  const dir = configDir(flags["config-dir"]);
  const cfg = loadConfig(dir);
  const name = flags.profile || cfg.active;
  if (!name || !cfg.profiles[name]) {
    if (!required) return { dir, cfg, name: null, profile: null };
    if (flags.profile) throw new UserError(`No profile named "${flags.profile}". Profiles: ${Object.keys(cfg.profiles).join(", ") || "(none)"}.`, 3);
    throw new UserError("Not logged in. Run `segment auth login` to connect a Segment workspace.", 3);
  }
  return { dir, cfg, name, profile: cfg.profiles[name] };
}

function connection(flags) {
  const sel = selectProfile(flags);
  return { ...sel, baseUrl: sel.profile.baseUrl || SPEC.servers[sel.profile.region], token: loadToken(sel.dir, sel.name, sel.profile) };
}

const workspaceLabel = (p) => `${p.workspace.name} (${p.workspace.slug}, ${p.region.toUpperCase()})`;

// ---------------------------------------------------------------------------
// auth

async function authLogin(flags) {
  const dir = configDir(flags["config-dir"]);
  const cfg = loadConfig(dir);
  const prompt = `Paste your Segment Public API token${flags.profile ? ` for profile "${flags.profile}"` : ""}. Create one in Segment under Settings > Access Management > Tokens. It is stored in your OS credential store.`;

  let token;
  if (flags["with-token"]) token = (await readStdin()).trim();
  else if (process.stdin.isTTY) {
    info(prompt);
    token = await promptHidden("Token: ");
  } else {
    const mintty = process.platform === "win32" && process.env.MSYSTEM ? " In Git Bash (mintty), run it as `winpty segment auth login`, or use PowerShell or Windows Terminal." : "";
    throw new UserError(
      "`segment auth login` needs an interactive terminal to read the token at a hidden prompt." +
        mintty +
        " For scripts and CI, pipe the token instead: `segment auth login --with-token < token.txt`.",
      3
    );
  }
  if (!token) throw new UserError("No token entered.", 3);
  if (!token.startsWith("sgp_")) info("Note: Public API tokens usually start with sgp_. Make sure this isn't a Config API token or a source write key.");

  const regions = flags.region ? [regionOf(flags.region)] : ["us", "eu"];
  let found = null;
  for (const region of regions) {
    const baseUrl = baseFor(region, flags["base-url"]);
    const r = await send({ baseUrl, token }, { method: "GET", path: "/", query: [], version: null });
    if (r.status === 200 && r.json && r.json.data && r.json.data.workspace) {
      found = { region, workspace: r.json.data.workspace };
      break;
    }
    if (![401, 403, 404].includes(r.status)) throw new UserError(`Could not verify the token against ${baseUrl}: HTTP ${r.status} ${r.statusText}`, 1);
  }
  if (!found) {
    throw new UserError(
      `Segment rejected this token${flags.region ? ` in the ${regions[0].toUpperCase()} region` : " in both the US and EU regions"}. ` +
        "Check that it is a Public API token (not a Config API token) and has not been revoked. Nothing was saved.",
      3
    );
  }

  const name = flags.profile || found.workspace.slug || "default";
  const previous = cfg.profiles[name];
  if (previous) removeToken(dir, name, previous);
  const storage = storeToken(dir, name, token, { insecure: !!flags["insecure-storage"] });
  cfg.profiles[name] = {
    workspace: { id: found.workspace.id, name: found.workspace.name, slug: found.workspace.slug },
    region: found.region,
    readOnly: !!flags["read-only"] || (!flags["read-write"] && !!(previous && previous.readOnly)),
    storage,
    ...(flags["base-url"] ? { baseUrl: baseFor(found.region, flags["base-url"]) } : {}),
    loggedInAt: new Date().toISOString(),
  };
  cfg.active = name;
  saveConfig(dir, cfg);
  out(`Logged in to ${workspaceLabel(cfg.profiles[name])} as profile "${name}" (now active).`);
  out(`Token stored in ${BACKENDS[storage].label}.${cfg.profiles[name].readOnly ? " Profile is read-only." : ""}`);
}

async function authStatus(flags) {
  const dir = configDir(flags["config-dir"]);
  const cfg = loadConfig(dir);
  const names = Object.keys(cfg.profiles);
  if (!names.length) throw new UserError("Not logged in. Run `segment auth login` to connect a Segment workspace.", 3);
  out(`Profiles (config: ${dir}):`);
  for (const n of names) {
    const p = cfg.profiles[n];
    out(`${n === cfg.active ? "*" : " "} ${n}  ${workspaceLabel(p)}  ${p.readOnly ? "read-only" : "read-write"}  token: ${BACKENDS[p.storage]?.label || p.storage}`);
  }
  if (flags.offline) return;
  const c = connection(flags);
  const r = await send(c, { method: "GET", path: "/", query: [], version: null });
  if (r.status === 200) out(`\nToken for "${c.name}" is valid: workspace ${r.json.data.workspace.name} (${r.json.data.workspace.id}).`);
  else throw new UserError(`\nToken for "${c.name}" was rejected: HTTP ${r.status} ${r.statusText}. Run \`segment auth login${flags.profile ? ` --profile ${c.name}` : ""}\` to replace it.`, 3);
}

function authSwitch(positionals, flags) {
  const name = positionals[0] || flags.profile;
  const dir = configDir(flags["config-dir"]);
  const cfg = loadConfig(dir);
  if (!name || !cfg.profiles[name]) throw new UserError(`Usage: segment auth switch <profile>. Profiles: ${Object.keys(cfg.profiles).join(", ") || "(none)"}.`);
  cfg.active = name;
  saveConfig(dir, cfg);
  out(`Active profile is now "${name}": ${workspaceLabel(cfg.profiles[name])}.`);
}

function authSet(flags) {
  const { dir, cfg, name, profile } = selectProfile(flags);
  if (!flags["read-only"] && !flags["read-write"] && !flags.region) throw new UserError("Nothing to change. Use --read-only, --read-write or --region us|eu.");
  if (flags["read-only"] && flags["read-write"]) throw new UserError("Choose either --read-only or --read-write.");
  if (flags["read-only"]) profile.readOnly = true;
  if (flags["read-write"]) profile.readOnly = false;
  if (flags.region) profile.region = regionOf(flags.region);
  saveConfig(dir, cfg);
  out(`Profile "${name}": ${workspaceLabel(profile)}, ${profile.readOnly ? "read-only" : "read-write"}.`);
}

function authLogout(flags) {
  const { dir, cfg, name, profile } = selectProfile(flags);
  removeToken(dir, name, profile);
  delete cfg.profiles[name];
  if (cfg.active === name) cfg.active = Object.keys(cfg.profiles)[0] || null;
  saveConfig(dir, cfg);
  out(`Logged out of "${name}" and removed its token from ${BACKENDS[profile.storage]?.label || profile.storage}.`);
  if (cfg.active) out(`Active profile is now "${cfg.active}".`);
  out("This only removes the token from this computer. Revoke it in Segment if it is no longer needed.");
}

// ---------------------------------------------------------------------------
// API commands

function emit(op, payload, flags, note) {
  if (note) info(note);
  const pretty = process.stdout.isTTY;
  const text = JSON.stringify(payload, null, pretty ? 2 : 0);
  let file = flags.out;
  if (!file && !flags.full && !pretty && text.length > MAX_INLINE) {
    const dir = path.join(os.tmpdir(), "segment-cli");
    fs.mkdirSync(dir, { recursive: true });
    file = path.join(dir, `${op.id}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  }
  if (!file) return out(text);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  const data = payload && payload.data;
  const key = listKey(data);
  out(
    [
      `Saved ${(text.length / 1024).toFixed(0)} KB to ${file}${flags.out ? "" : " (too large to print; use --full to print anyway)"}.`,
      data ? `data keys: ${Object.keys(data).join(", ")}` : "",
      key ? `${key}: ${data[key].length} items. First item:\n${JSON.stringify(data[key][0], null, 1).slice(0, 4000)}` : "",
    ]
      .filter(Boolean)
      .join("\n")
  );
}

async function cmdRead(positionals, flags) {
  const [opId, ...rest] = positionals;
  const op = findOp(opId);
  if (op.method !== "GET") throw new UserError(`${op.id} is a ${op.method} operation. Use \`segment write ${op.id}\`.`);
  const req = buildRequest(op, parseParams(rest), flags["api-version"]);
  const fields = parseFields(flags.fields);
  const c = connection(flags);

  let r = await send(c, req);
  if (r.status >= 400) throw new UserError(errorText(op, r), 1);
  let payload = r.json;
  let note = "";
  const key = listKey(payload && payload.data);
  if (flags.all && key) {
    const items = [...payload.data[key]];
    let pages = 1;
    let next = payload.data.pagination && payload.data.pagination.next;
    const limit = Math.min(Math.max(1, Number(flags["max-pages"]) || 20), 100);
    const base = { ...req, query: req.query.filter(([k]) => k !== "pagination.cursor") };
    while (next !== undefined && next !== null && next !== "" && pages < limit) {
      r = await send(c, base, undefined, [["pagination.cursor", String(next)]]);
      if (r.status >= 400) throw new UserError(`Failed on page ${pages + 1} after ${items.length} items.\n` + errorText(op, r), 1);
      items.push(...(r.json.data[key] || []));
      next = r.json.data.pagination && r.json.data.pagination.next;
      pages++;
    }
    const total = payload.data.pagination && payload.data.pagination.totalEntries;
    payload = { data: { ...payload.data, [key]: items, pagination: { pagesFetched: pages, itemsReturned: items.length, totalEntries: total, next: next ?? null } } };
    note = next ? `Stopped after ${pages} pages (--max-pages). More results exist.` : `Fetched all ${items.length} items in ${pages} page(s).`;
  } else if (key && payload.data.pagination && payload.data.pagination.next) {
    note = `First page only (${payload.data[key].length} items${payload.data.pagination.totalEntries ? ` of ${payload.data.pagination.totalEntries}` : ""}). Add --all for everything.`;
  }
  const { unmatched, available } = unmatchedFields(payload, fields);
  if (unmatched.length) {
    info(
      `Warning: --fields ${unmatched.map((f) => `"${f}"`).join(", ")} matched nothing in the response. ` +
        `Fields are case-sensitive; nested ones use dots (metadata.name). Available: ${available.join(", ") || "(none)"}.`
    );
  }
  emit(op, project(payload, fields), flags, note);
}

async function cmdWrite(positionals, flags) {
  const [opId, ...rest] = positionals;
  const op = findOp(opId);
  if (op.method === "GET") throw new UserError(`${op.id} is a GET operation. Use \`segment read ${op.id}\`.`);
  const body = await parseBody(flags.body);
  if (op.body && op.body.required && body === undefined) throw new UserError(`${op.id} requires a request body (--body). See \`segment describe ${op.id}\`.`);
  if (body !== undefined && !op.body) throw new UserError(`${op.id} does not take a request body; pass parameters as key=value.`);
  const req = buildRequest(op, parseParams(rest), flags["api-version"]);
  const sel = selectProfile(flags, { required: !!flags.yes });

  if (!flags.yes) {
    const baseUrl = sel.profile ? sel.profile.baseUrl || SPEC.servers[sel.profile.region] : SPEC.servers.us;
    out(
      [
        `DRY RUN: nothing was sent.${sel.profile ? ` Target: profile "${sel.name}", ${workspaceLabel(sel.profile)}.` : " (not logged in)"}`,
        `${req.method} ${urlFor(baseUrl, req)}`,
        `Content-Type: ${req.version ? mediaType(req.version) : "application/json"}`,
        body !== undefined ? "Body:\n" + JSON.stringify(body, null, 2) : "No body",
        sel.profile && sel.profile.readOnly ? `Profile "${sel.name}" is read-only, so --yes would be refused.` : "Re-run with --yes to send it.",
      ].join("\n")
    );
    return;
  }
  if (sel.profile.readOnly) {
    throw new UserError(`Profile "${sel.name}" is read-only, so nothing was sent. To allow changes, run \`segment auth set --profile ${sel.name} --read-write\`.`, 5);
  }
  const c = connection(flags);
  const r = await send(c, req, body);
  if (r.status >= 400) throw new UserError(errorText(op, r), 1);
  emit(op, r.json ?? { status: r.status }, flags, `HTTP ${r.status} ${r.statusText}: ${op.method} ${op.path} on ${workspaceLabel(c.profile)}.`);
}

// ---------------------------------------------------------------------------

async function main(argv) {
  const { positionals, flags } = parseArgs(argv);
  const [cmd, ...rest] = positionals;
  if (flags.version || cmd === "version") return out(`segment ${CLI_VERSION} (Segment Public API spec v${SPEC.version})`);
  if (!cmd || flags.help || cmd === "help") return out(HELP);

  switch (cmd) {
    case "auth": {
      const [sub, ...args] = rest;
      if (sub === "login") return authLogin(flags);
      if (sub === "status") return authStatus(flags);
      if (sub === "switch") return authSwitch(args, flags);
      if (sub === "set") return authSet(flags);
      if (sub === "logout") return authLogout(flags);
      throw new UserError("Usage: segment auth login|status|switch|set|logout. Run `segment --help` for details.");
    }
    case "search": {
      const query = rest.join(" ");
      if (!query && !flags.tag) return out("Tags (operation count):\n" + listTags() + "\n\nSearch with keywords or --tag.");
      const hits = searchOps(query, { tag: flags.tag, method: flags.method }, Math.min(Math.max(1, Number(flags.limit) || 15), 200));
      if (!hits.length) throw new UserError(`No operations match "${query}"${flags.tag ? ` in tag ${flags.tag}` : ""}. Try broader keywords, or run \`segment search\` to list tags.`, 1);
      return out(hits.map(opLine).join("\n"));
    }
    case "describe":
      return out(describeOp(findOp(rest[0]), Math.min(Number(flags.depth) || 3, 6)));
    case "read":
      return cmdRead(rest, flags);
    case "write":
      return cmdWrite(rest, flags);
    default:
      throw new UserError(`Unknown command "${cmd}". Run \`segment --help\`.`);
  }
}

main(process.argv.slice(2)).catch((e) => {
  if (e instanceof UserError) {
    process.stderr.write(e.message + "\n");
    process.exit(e.exitCode);
  }
  process.stderr.write(`Unexpected error: ${e.stack || e.message}\n`);
  process.exit(1);
});
