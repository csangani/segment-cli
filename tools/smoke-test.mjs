#!/usr/bin/env node
// Smoke test for the segment CLI. Starts a mock Segment API on localhost with /us and /eu
// regions, drives the CLI as a subprocess with an isolated config directory, and checks
// login, profiles, credential storage, search/describe/read/write and safety behaviour.
//
//   node tools/smoke-test.mjs

import http from "node:http";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = process.env.SEGMENT_CLI_UNDER_TEST ? path.resolve(process.env.SEGMENT_CLI_UNDER_TEST) : path.join(ROOT, "src", "cli.mjs");
const CONFIG = fs.mkdtempSync(path.join(os.tmpdir(), "segment-cli-test-"));
const US_TOKEN = "sgp_US_test_token_123";
const EU_TOKEN = "sgp_EU_test_token_456";

// ---- mock Segment API --------------------------------------------------------
const seen = [];
let rateLimitedOnce = false;
const SOURCES = Array.from({ length: 5 }, (_, i) => ({ id: `src${i}`, slug: `source-${i}`, enabled: i % 2 === 0, metadata: { name: `Kind ${i}`, id: `m${i}` } }));
const WORKSPACES = { us: { id: "wsUS", name: "US Workspace", slug: "us-ws" }, eu: { id: "wsEU", name: "EU Workspace", slug: "eu-ws" } };
const mock = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const url = new URL(req.url, "http://x");
    const [, region, ...rest] = url.pathname.split("/");
    const p = "/" + rest.join("/");
    seen.push({ method: req.method, region, path: p, url: req.url, auth: req.headers.authorization, accept: req.headers.accept, ctype: req.headers["content-type"], body });
    const send = (status, json, headers = {}) => {
      res.writeHead(status, { "content-type": "application/json", ...headers });
      res.end(JSON.stringify(json));
    };
    const expected = region === "us" ? US_TOKEN : EU_TOKEN;
    if (req.headers.authorization !== `Bearer ${expected}`) return send(401, { errors: [{ type: "unauthorized", message: "bad token" }] });
    if (p === "/") return send(200, { data: { workspace: WORKSPACES[region] } });
    if (p === "/sources" && req.method === "GET") {
      if (!rateLimitedOnce) {
        rateLimitedOnce = true;
        return send(429, { message: "slow down", data: { msBeforeNext: 50 } }, { "retry-after": "0" });
      }
      const count = Number(url.searchParams.get("pagination.count"));
      const start = Number(url.searchParams.get("pagination.cursor") || 0);
      const next = start + count < SOURCES.length ? String(start + count) : null;
      return send(200, { data: { sources: SOURCES.slice(start, start + count), pagination: { current: String(start), next, totalEntries: SOURCES.length } } });
    }
    if (p === "/warehouses") {
      const big = Array.from({ length: 400 }, (_, i) => ({ id: `wh${i}`, settings: { blob: "x".repeat(200) } }));
      return send(200, { data: { warehouses: big, pagination: { current: "0", next: null, totalEntries: 400 } } });
    }
    if (p === "/sources" && req.method === "POST") return send(201, { data: { source: { id: "new1", ...JSON.parse(body) } } });
    return send(404, { errors: [{ type: "not-found", message: "Not found" }] });
  });
});
await new Promise((r) => mock.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${mock.address().port}/{region}`;

// ---- CLI runner --------------------------------------------------------------
const outputs = [];
function cli(args, input) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI, ...args, "--config-dir", CONFIG], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => {
      outputs.push(stdout + stderr);
      resolve({ code, stdout, stderr, all: stdout + stderr });
    });
    child.stdin.end(input ?? "");
  });
}

let failures = 0;
const check = (name, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${!cond && detail ? `\n      ${String(detail).slice(0, 700).replace(/\n/g, "\n      ")}` : ""}`);
  if (!cond) failures++;
};
const credFile = path.join(CONFIG, "credentials.json");
const readCreds = () => (fs.existsSync(credFile) ? fs.readFileSync(credFile, "utf8") : "");
const config = () => JSON.parse(fs.readFileSync(path.join(CONFIG, "config.json"), "utf8"));

// ---- offline commands --------------------------------------------------------
let r = await cli(["--version"]);
check("--version prints CLI and spec versions", r.code === 0 && /segment \d+\.\d+\.\d+ \(Segment Public API spec v/.test(r.stdout), r.all);
r = await cli(["--help"]);
check("--help lists commands", r.code === 0 && /segment auth login/.test(r.stdout) && /segment write/.test(r.stdout), r.all);
r = await cli(["search"]);
check("search with no args lists tags", r.code === 0 && /Tracking Plans \(\d+\)/.test(r.stdout), r.all);
r = await cli(["search", "list", "sources"]);
check("search 'list sources' ranks listSources first", r.stdout.split("\n")[0].includes("· listSources ·"), r.all);
r = await cli(["describe", "createSource"]);
check("describe shows body fields, example and usage line", /slug: string/.test(r.stdout) && /Example body/.test(r.stdout) && /Usage: segment write createSource --body @body.json/.test(r.stdout), r.all);
r = await cli(["describe", "listSorces"]);
check("unknown operationId suggests alternatives (exit 2)", r.code === 2 && /Did you mean/.test(r.stderr), r.all);

// ---- not logged in -------------------------------------------------------------
r = await cli(["auth", "status"]);
check("auth status before login exits 3", r.code === 3 && /Not logged in/.test(r.stderr), r.all);
r = await cli(["read", "getWorkspace"]);
check("read before login exits 3 with guidance", r.code === 3 && /segment auth login/.test(r.stderr), r.all);
r = await cli(["write", "deleteSource", "sourceId=abc"]);
check("write dry run works before login", r.code === 0 && /DRY RUN/.test(r.stdout) && /not logged in/.test(r.stdout), r.all);

// ---- login ---------------------------------------------------------------------
r = await cli(["auth", "login", "--base-url", BASE], "");
check("login without a terminal or --with-token refuses (no GUI)", r.code === 3 && /needs an interactive terminal/.test(r.stderr) && /--with-token/.test(r.stderr), r.all);

r = await cli(["auth", "login", "--with-token", "--base-url", BASE], "sgp_wrong");
check("bad token is rejected in both regions and nothing is saved", r.code === 3 && /both the US and EU/.test(r.stderr) && !fs.existsSync(path.join(CONFIG, "config.json")), r.all);

r = await cli(["auth", "login", "--with-token", "--base-url", BASE], EU_TOKEN + "\n");
// Which credential store to expect: DPAPI on Windows; elsewhere only when the test runner says so
// (e.g. SEGMENT_TEST_EXPECT_STORE=secret-service in a container with gnome-keyring running).
const osStore = process.env.SEGMENT_TEST_EXPECT_STORE || (process.platform === "win32" ? "dpapi" : null);
check("login detects the EU region and names the profile after the workspace", r.code === 0 && /EU Workspace \(eu-ws, EU\)/.test(r.stdout) && config().active === "eu-ws", r.all);
console.log(`      (credential store used: ${config().profiles["eu-ws"]?.storage})`);
if (osStore) check(`token stored in ${osStore}, not in plaintext`, config().profiles["eu-ws"].storage === osStore && !readCreds().includes(EU_TOKEN), readCreds());

r = await cli(["auth", "login", "--with-token", "--base-url", BASE, "--profile", "test", "--insecure-storage"], US_TOKEN);
check("second login with --profile and file storage", r.code === 0 && /US Workspace/.test(r.stdout) && config().active === "test" && config().profiles.test.storage === "file", r.all);

r = await cli(["auth", "status"]);
check("auth status lists both profiles, marks active, verifies the token", r.code === 0 && /\* test/.test(r.stdout) && /  eu-ws/.test(r.stdout) && /is valid: workspace US Workspace/.test(r.stdout), r.all);

r = await cli(["auth", "switch", "eu-ws"]);
check("auth switch changes the active profile", r.code === 0 && config().active === "eu-ws", r.all);
r = await cli(["read", "getWorkspace"]);
check("read uses the active profile's region and token (decrypted)", r.code === 0 && /"slug":"eu-ws"/.test(r.stdout) && seen.at(-1).region === "eu", r.all);
r = await cli(["read", "getWorkspace", "--profile", "test"]);
check("--profile overrides the active profile", r.code === 0 && /"slug":"us-ws"/.test(r.stdout) && seen.at(-1).region === "us", r.all);

// ---- read ----------------------------------------------------------------------
r = await cli(["read", "listSources", "pagination.count=2", "--all", "--fields", "id,enabled,metadata.name", "--profile", "test"]);
let parsed = r.code === 0 ? JSON.parse(r.stdout) : null;
check("429 is retried, then all pages are merged", parsed && parsed.data.sources.length === 5 && parsed.data.pagination.pagesFetched === 3, r.all);
check("--fields keeps only the requested attributes", parsed && JSON.stringify(parsed.data.sources[0]) === JSON.stringify({ id: "src0", enabled: true, "metadata.name": "Kind 0" }), r.stdout.slice(0, 300));
check("notes go to stderr, JSON to stdout", /Fetched all 5 items/.test(r.stderr) && !/Fetched all/.test(r.stdout), r.all);

// PowerShell's npm shim turns an unquoted `--fields a,b,c` into the single argument "a b c".
r = await cli(["read", "listSources", "--fields", "id enabled metadata.name", "--profile", "test"]);
parsed = r.code === 0 ? JSON.parse(r.stdout) : null;
check("--fields also accepts a space-separated list (PowerShell)", parsed && JSON.stringify(parsed.data.sources[0]) === JSON.stringify({ id: "src0", enabled: true, "metadata.name": "Kind 0" }), r.all.slice(0, 400));
r = await cli(["read", "listSources", "--fields", "id,nosuchfield", "--profile", "test"]);
parsed = r.code === 0 ? JSON.parse(r.stdout) : null;
check(
  "--fields warns about fields that match nothing and lists the available ones",
  parsed && parsed.data.sources[0].id === "src0" && /"nosuchfield" matched nothing/.test(r.stderr) && /Available: id, slug, enabled, metadata/.test(r.stderr) && !/"id" matched nothing/.test(r.stderr),
  r.stderr
);
check("dotted pagination keys in the query", seen.some((s) => /pagination\.count=2&pagination\.cursor=2/.test(s.url)));

r = await cli(["read", "listSources", "--profile", "test"]);
check("default page size is added to list calls", r.code === 0 && /pagination\.count=200/.test(seen.at(-1).url), seen.at(-1).url);

r = await cli(["read", "listWarehouses", "--profile", "test"]);
const saved = (r.stdout.match(/Saved \d+ KB to (.+?\.json)/) || [])[1];
check("large output is saved to a file with a summary", r.code === 0 && saved && fs.existsSync(saved) && /warehouses: 400 items/.test(r.stdout), r.all.slice(0, 400));
r = await cli(["read", "listWarehouses", "--profile", "test", "--full"]);
check("--full prints large output anyway", r.code === 0 && JSON.parse(r.stdout).data.warehouses.length === 400);
const outFile = path.join(CONFIG, "out.json");
r = await cli(["read", "getWorkspace", "--profile", "test", "--out", outFile]);
check("--out writes the response to a file", r.code === 0 && JSON.parse(fs.readFileSync(outFile, "utf8")).data.workspace.slug === "us-ws", r.all);

r = await cli(["read", "getSource", "sourceId=missing", "--profile", "test"]);
check("HTTP errors exit 1 with status and hint on stderr", r.code === 1 && /HTTP 404/.test(r.stderr) && /Not found/.test(r.stderr), r.all);
r = await cli(["read", "getWorkspace", "--api-version", "beta", "--profile", "test"]);
check("--api-version beta sends the v1beta media type", r.code === 0 && seen.at(-1).accept === "application/vnd.segment.v1beta+json", seen.at(-1).accept);
r = await cli(["read", "createSource"]);
check("read refuses write operations", r.code === 2 && /Use `segment write createSource`/.test(r.stderr), r.all);
r = await cli(["read", "getSource"]);
check("missing path parameter is reported", r.code === 2 && /Missing path parameter/.test(r.stderr), r.all);
r = await cli(["read", "getSource", "sourceId=a", "nope=1"]);
check("unknown parameter is reported", r.code === 2 && /Unknown parameter/.test(r.stderr), r.all);

// ---- write ---------------------------------------------------------------------
const before = seen.length;
r = await cli(["write", "deleteSource", "sourceId=abc", "--profile", "test"]);
check("write without --yes is a dry run naming the target workspace", r.code === 0 && /DRY RUN/.test(r.stdout) && /US Workspace/.test(r.stdout) && /DELETE .*\/us\/sources\/abc/.test(r.stdout) && seen.length === before, r.all);
r = await cli(["write", "batchQueryActivationsForSpace", "spaceId=sp1", "--body", "{}"]);
check("alpha-only operation gets the v1alpha media type", /vnd\.segment\.v1alpha\+json/.test(r.stdout), r.all);
const bodyFile = path.join(CONFIG, "body.json");
fs.writeFileSync(bodyFile, JSON.stringify({ slug: "s", enabled: true, metadataId: "m", settings: {} }));
r = await cli(["write", "createSource", "--body", "@" + bodyFile, "--yes", "--profile", "test"]);
check("write --yes sends the JSON body", r.code === 0 && seen.at(-1).method === "POST" && seen.at(-1).ctype === "application/json" && JSON.parse(seen.at(-1).body).slug === "s", r.all);
r = await cli(["write", "createSource", "--body", "{not json", "--profile", "test"]);
check("invalid --body JSON is reported", r.code === 2 && /not valid JSON/.test(r.stderr), r.all);

r = await cli(["auth", "set", "--read-only", "--profile", "test"]);
check("auth set --read-only", r.code === 0 && config().profiles.test.readOnly === true, r.all);
const beforeRO = seen.length;
r = await cli(["write", "createSource", "--body", "@" + bodyFile, "--yes", "--profile", "test"]);
check("read-only profile refuses writes (exit 5) without sending", r.code === 5 && /read-only/.test(r.stderr) && seen.length === beforeRO, r.all);

// ---- logout & secrecy -----------------------------------------------------------
r = await cli(["auth", "logout", "--profile", "test"]);
check("logout removes the profile and its stored token", r.code === 0 && !config().profiles.test && !readCreds().includes(US_TOKEN), r.all);
r = await cli(["auth", "logout"]);
check("logout of the last profile clears everything", r.code === 0 && config().active === null && readCreds().trim() === "{}", readCreds());
check("no token ever appears in CLI output", !outputs.some((o) => o.includes(US_TOKEN) || o.includes(EU_TOKEN)));

mock.close();
fs.rmSync(CONFIG, { recursive: true, force: true });
console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
