#!/usr/bin/env node
// Offline repository checks, run in CI as `npm run lint`:
//   - every .mjs file parses (node --check)
//   - package.json and the Claude Code manifests are valid JSON and agree on name/version
//   - CHANGELOG.md has a section for the package version
//   - spec.json and the generated operations index agree
//   - skills follow the Agent Skills spec (name = folder, allowed frontmatter fields, lengths)
//   - relative links and #anchors in Markdown files resolve

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);

let failures = 0;
const ok = (msg) => console.log(`ok    ${msg}`);
const fail = (msg) => {
  console.log(`FAIL  ${msg}`);
  failures++;
};
const readJson = (f) => {
  try {
    return JSON.parse(fs.readFileSync(f, "utf8"));
  } catch (e) {
    fail(`${f} is not valid JSON: ${e.message}`);
    return null;
  }
};
const walk = (dir, filter, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".git")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, filter, out);
    else if (filter(p)) out.push(p);
  }
  return out;
};

// ---- syntax ---------------------------------------------------------------------
for (const f of walk(".", (p) => p.endsWith(".mjs"))) {
  const r = spawnSync(process.execPath, ["--check", f], { encoding: "utf8" });
  if (r.status === 0) ok(`syntax ${f}`);
  else fail(`syntax ${f}\n${r.stderr}`);
}

// ---- manifests and versions ----------------------------------------------------------
const pkg = readJson("package.json");
const plugin = readJson(".claude-plugin/plugin.json");
const market = readJson(".claude-plugin/marketplace.json");
if (pkg && plugin && market) {
  if (!pkg.name.startsWith("@csangani/")) fail(`package name ${pkg.name} must be scoped @csangani/ to publish to GitHub Packages`);
  else ok(`package name ${pkg.name}`);
  if (pkg.publishConfig?.registry !== "https://npm.pkg.github.com") fail("publishConfig.registry must be https://npm.pkg.github.com");
  else ok("publishConfig points at GitHub Packages");
  if (plugin.version !== pkg.version) fail(`plugin.json version ${plugin.version} != package.json version ${pkg.version}`);
  else ok(`versions agree (${pkg.version})`);
  const entry = market.plugins.find((p) => p.name === plugin.name);
  if (!entry) fail(`marketplace.json has no entry for plugin "${plugin.name}"`);
  else ok(`marketplace lists plugin "${plugin.name}"`);
  const changelog = fs.readFileSync("CHANGELOG.md", "utf8");
  if (!changelog.includes(`## [${pkg.version}]`)) fail(`CHANGELOG.md has no "## [${pkg.version}]" section`);
  else ok(`CHANGELOG.md has a ${pkg.version} section`);
}

// ---- generated files ----------------------------------------------------------------
const spec = readJson("spec.json");
if (spec) {
  const index = fs.readFileSync("skills/segment-api/references/operations.md", "utf8");
  const listed = (index.match(/^- `[A-Z]+ /gm) || []).length;
  if (!index.includes(`spec v${spec.version} `)) fail(`operations.md was not generated from spec v${spec.version}; run npm run update-spec`);
  else if (listed !== spec.operations.length) fail(`operations.md lists ${listed} operations, spec.json has ${spec.operations.length}`);
  else ok(`spec v${spec.version}: ${spec.operations.length} operations, index in sync`);
}

// ---- skills ------------------------------------------------------------------------
const ALLOWED = new Set(["name", "description", "license", "compatibility", "metadata", "allowed-tools"]);
const skillDirs = fs.readdirSync("skills", { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
for (const dir of skillDirs) {
  const file = path.join("skills", dir, "SKILL.md");
  if (!fs.existsSync(file)) {
    fail(`${file} is missing`);
    continue;
  }
  const text = fs.readFileSync(file, "utf8");
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) {
    fail(`${file} has no YAML frontmatter`);
    continue;
  }
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0 && !/^\s/.test(line)) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const issues = [];
  if (fm.name !== dir) issues.push(`name "${fm.name}" must equal folder "${dir}"`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.name || "") || (fm.name || "").length > 64) issues.push("name must be lowercase-hyphenated, at most 64 chars");
  if (!fm.description) issues.push("description is required");
  else if (fm.description.length > 1024) issues.push(`description is ${fm.description.length} chars (max 1024)`);
  if (fm.compatibility && fm.compatibility.length > 500) issues.push("compatibility is over 500 chars");
  for (const k of Object.keys(fm)) if (!ALLOWED.has(k)) issues.push(`frontmatter field "${k}" is not in the Agent Skills spec`);
  if (fm["allowed-tools"] && /segment (write|auth (login|logout|set))/.test(fm["allowed-tools"])) issues.push("allowed-tools must only pre-approve read-only commands");
  const lines = text.split("\n").length;
  if (lines > 500) issues.push(`${lines} lines (keep under 500)`);
  if (issues.length) fail(`skill ${dir}: ${issues.join("; ")}`);
  else ok(`skill ${dir}`);
}

// ---- markdown links ------------------------------------------------------------------
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\w\- ]/g, "")
    .trim()
    .replace(/ /g, "-");
const anchorsOf = (f) => new Set([...fs.readFileSync(f, "utf8").matchAll(/^#+ (.+)$/gm)].map((m) => slug(m[1])));
const mdFiles = walk(".", (p) => p.endsWith(".md") && !p.includes("references"));
let linkCount = 0;
for (const f of mdFiles) {
  const text = fs.readFileSync(f, "utf8").replace(/```[\s\S]*?```/g, "");
  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const link = m[1];
    if (/^(https?:|mailto:)/.test(link)) continue;
    linkCount++;
    const [target, anchor] = link.split("#");
    const resolved = target ? path.join(path.dirname(f), target) : f;
    if (!fs.existsSync(resolved)) {
      fail(`${f}: broken link ${link}`);
      continue;
    }
    if (anchor && resolved.endsWith(".md") && !anchorsOf(resolved).has(anchor)) fail(`${f}: broken anchor ${link}`);
  }
}
ok(`${linkCount} relative Markdown links checked across ${mdFiles.length} files`);

console.log(failures ? `\n${failures} problem(s) found` : "\nLint passed");
process.exit(failures ? 1 : 0);
