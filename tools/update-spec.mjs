#!/usr/bin/env node
// Regenerates the bundled Segment Public API spec and the operations index.
//
//   node tools/update-spec.mjs                 # fetch the live spec from docs.segmentapis.com
//   node tools/update-spec.mjs path/to/spec    # use a local swagger.json / OpenAPI JSON file
//
// Outputs:
//   spec.json                                                 trimmed spec the CLI loads
//   skills/segment-api/references/operations.md               one line per operation, grouped by tag

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SPEC_OUT = path.join(ROOT, "spec.json");
const INDEX_OUT = path.join(ROOT, "skills", "segment-api", "references", "operations.md");
const DOCS = "https://docs.segmentapis.com/";
const METHODS = ["get", "post", "put", "patch", "delete"];

async function loadSpec() {
  const local = process.argv[2];
  if (local) return JSON.parse(fs.readFileSync(local, "utf8"));

  // docs.segmentapis.com is a Redocly site; the full OpenAPI document is embedded in a
  // redocly-state-<hash>.js file referenced from the home page.
  const html = await (await fetch(DOCS)).text();
  const m = html.match(/src="([^"]*redocly-state-[^"]+\.js)"/);
  if (!m) throw new Error("Could not find the redocly-state script on " + DOCS);
  const js = await (await fetch(new URL(m[1], DOCS))).text();
  const start = js.indexOf("JSON.parse(") + "JSON.parse(".length;
  const end = js.lastIndexOf(");");
  const state = JSON.parse(JSON.parse(js.slice(start, end)));
  return state.definition.data;
}

// Strip vendor extensions and examples to keep the bundled file small.
function clean(node) {
  if (Array.isArray(node)) return node.map(clean);
  if (!node || typeof node !== "object") return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith("x-") || k === "example" || k === "examples") continue;
    out[k] = clean(v);
  }
  return out;
}

const VERSION_RANK = { v2: 5, v1: 4, json: 3, v1beta: 2, beta: 2, v1alpha: 1, alpha: 1 };
function versionOf(ct) {
  if (ct === "application/json") return "json";
  const m = ct.match(/vnd\.segment\.([a-z0-9]+)\+json/);
  return m ? m[1] : ct;
}

function trimOps(spec) {
  const ops = [];
  for (const [p, item] of Object.entries(spec.paths)) {
    for (const method of METHODS) {
      const op = item[method];
      if (!op || !op.operationId) continue;
      const ok = op.responses["200"] || op.responses["201"] || Object.values(op.responses)[0] || {};
      const versions = Object.keys(ok.content || {}).map(versionOf);
      const best = versions.filter((v) => v !== "json").sort((a, b) => (VERSION_RANK[b] || 0) - (VERSION_RANK[a] || 0));
      let body;
      if (op.requestBody) {
        const content = op.requestBody.content;
        const ct = content["application/json"] ? "application/json" : Object.keys(content).sort((a, b) => (VERSION_RANK[versionOf(b)] || 0) - (VERSION_RANK[versionOf(a)] || 0))[0];
        body = {
          required: !!op.requestBody.required,
          schema: clean(content[ct].schema),
          example: content[ct].example,
          // Alpha inputs can differ from v1 inputs, so keep a per-version schema ref when they differ.
          byVersion: Object.fromEntries(Object.entries(content).map(([k, v]) => [versionOf(k), v.schema && v.schema.$ref])),
        };
      }
      ops.push({
        id: op.operationId,
        method: method.toUpperCase(),
        path: p,
        tag: (op.tags || ["Other"])[0],
        summary: op.summary || "",
        description: (op.description || "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim(),
        deprecated: !!op.deprecated,
        versions,
        defaultVersion: versions.includes("json") ? null : best[0] || null,
        params: (op.parameters || []).map((pr) => ({
          name: pr.name,
          in: pr.in,
          required: !!pr.required,
          description: (pr.description || "").trim(),
          schema: clean(pr.schema),
          example: pr.example,
        })),
        body,
        response: ok.content ? clean(Object.values(ok.content)[0].schema) : null,
      });
    }
  }
  return ops;
}

function writeIndex(spec, ops) {
  const byTag = new Map();
  for (const op of ops) {
    if (!byTag.has(op.tag)) byTag.set(op.tag, []);
    byTag.get(op.tag).push(op);
  }
  const groups = (spec["x-tagGroups"] || []).flatMap((g) => g.tags);
  const tags = [...byTag.keys()].sort((a, b) => {
    const ia = groups.indexOf(a), ib = groups.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b);
  });
  const lines = [
    "# Segment Public API operations",
    "",
    `Generated from the Segment Public API spec v${spec.info.version} by \`tools/update-spec.mjs\`. Do not edit by hand.`,
    "",
    "Each line: `METHOD path` · `operationId` · summary · versions, most stable first.",
    "Operations marked *alpha only* or *beta only* have no stable version; the CLI sends the right media type automatically.",
    "Run `segment describe <operationId>` for parameters and the request body schema.",
    "",
  ];
  for (const tag of tags) {
    lines.push(`## ${tag}`, "");
    for (const op of byTag.get(tag).sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))) {
      const dep = op.deprecated ? " **(deprecated)**" : "";
      const versions = op.versions.filter((v) => v !== "json").sort((a, b) => (VERSION_RANK[b] || 0) - (VERSION_RANK[a] || 0));
      const only = op.defaultVersion ? ` · *${op.defaultVersion.replace("v1", "")} only*` : "";
      lines.push(`- \`${op.method} ${op.path}\` · \`${op.id}\` · ${op.summary}${dep} · ${versions.join(", ")}${only}`);
    }
    lines.push("");
  }
  fs.writeFileSync(INDEX_OUT, lines.join("\n"));
}

const spec = await loadSpec();
const ops = trimOps(spec);
const out = {
  source: DOCS,
  version: spec.info.version,
  servers: { us: "https://api.segmentapis.com", eu: "https://eu1.api.segmentapis.com" },
  tags: (spec.tags || []).filter((t) => ops.some((o) => o.tag === t.name)).map((t) => ({ name: t.name, description: (t.description || "").slice(0, 600) })),
  operations: ops,
  schemas: clean(spec.components.schemas),
};
fs.mkdirSync(path.dirname(SPEC_OUT), { recursive: true });
fs.writeFileSync(SPEC_OUT, JSON.stringify(out));
writeIndex(spec, ops);
console.log(`Spec v${spec.info.version}: ${ops.length} operations, ${Object.keys(out.schemas).length} schemas`);
console.log(`Wrote ${path.relative(ROOT, SPEC_OUT)} (${(fs.statSync(SPEC_OUT).size / 1024).toFixed(0)} KB)`);
console.log(`Wrote ${path.relative(ROOT, INDEX_OUT)}`);
