// Segment Public API: spec lookup, request building, HTTP, pagination and response shaping.

import fs from "node:fs";

export const SPEC = JSON.parse(fs.readFileSync(new URL("../spec.json", import.meta.url), "utf8"));
export const CLI_VERSION = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
const OPS = new Map(SPEC.operations.map((o) => [o.id, o]));
const OPS_LOWER = new Map(SPEC.operations.map((o) => [o.id.toLowerCase(), o]));
const USER_AGENT = `segment-cli/${CLI_VERSION}`;

export class UserError extends Error {
  constructor(message, exitCode = 2) {
    super(message);
    this.exitCode = exitCode;
  }
}

const info = (msg) => process.stderr.write(msg + "\n");

// ---------------------------------------------------------------------------
// Spec helpers

const VERSION_ALIASES = { stable: "v1", v1: "v1", v2: "v2", beta: "v1beta", v1beta: "v1beta", alpha: "v1alpha", v1alpha: "v1alpha" };
export const mediaType = (v) => `application/vnd.segment.${v}+json`;

export function resolve(schema) {
  let s = schema;
  for (let i = 0; s && s.$ref && i < 10; i++) s = SPEC.schemas[s.$ref.split("/").pop()];
  return s || {};
}

export function findOp(id) {
  if (!id) throw new UserError("An operationId is required. Find one with `segment search <keywords>`.");
  const op = OPS.get(id) || OPS_LOWER.get(String(id).toLowerCase());
  if (op) return op;
  const near = searchOps(String(id), {}, 5).map((o) => o.id);
  throw new UserError(`Unknown operationId "${id}".${near.length ? " Did you mean: " + near.join(", ") + "?" : ""} Find operations with \`segment search <keywords>\`.`);
}

const words = (s) =>
  String(s)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
const stem = (w) => w.replace(/s$/, "");

export function searchOps(query, { tag, method } = {}, limit = 15) {
  const terms = words(query).map(stem);
  const scored = [];
  for (const op of SPEC.operations) {
    if (tag && op.tag.toLowerCase() !== tag.toLowerCase()) continue;
    if (method && op.method !== method.toUpperCase()) continue;
    if (!terms.length) {
      scored.push({ op, score: 0 });
      continue;
    }
    const fields = [
      [words(op.id + " " + op.summary).map(stem), 3],
      [words(op.path + " " + op.tag).map(stem), 2],
      [words(op.description.slice(0, 400)).map(stem), 0.5],
    ];
    let score = 0;
    let matched = 0;
    for (const t of terms) {
      let best = 0;
      for (const [ws, weight] of fields) {
        if (ws.includes(t)) best = Math.max(best, weight);
        else if (ws.some((w) => w.startsWith(t) || (t.length > 3 && w.includes(t)))) best = Math.max(best, weight * 0.6);
      }
      if (best > 0) matched++;
      score += best;
    }
    // Prefer tight matches: "list sources" should rank listSources above listConnectedDestinationsFromSource.
    const idWords = words(op.id).map(stem);
    const tightness = idWords.filter((w) => terms.includes(w)).length / idWords.length;
    if (matched) scored.push({ op, score: score * (matched / terms.length) + 2 * tightness });
  }
  scored.sort((a, b) => b.score - a.score || a.op.id.localeCompare(b.op.id));
  return scored.slice(0, limit).map((s) => s.op);
}

export const opLine = (op) =>
  `${op.method} ${op.path} · ${op.id} · ${op.summary} [${op.tag}]` +
  (op.defaultVersion ? ` (${op.defaultVersion} only)` : "") +
  (op.deprecated ? " (deprecated)" : "");

function oneLine(text, max = 160) {
  const t = String(text || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

function typeLabel(schema) {
  const s = resolve(schema);
  if (s.enum) return s.enum.map((e) => JSON.stringify(e)).join(" | ");
  if (s.type === "array") return `${typeLabel(s.items)}[]`;
  if (s.oneOf || s.anyOf) return (s.oneOf || s.anyOf).map(typeLabel).join(" | ");
  if (s.allOf || s.type === "object" || s.properties) return "object";
  return s.type || "any";
}

// Render a schema as an indented field list, expanding nested objects up to `depth`.
function renderSchema(schema, depth, indent = "", seen = new Set(), out = []) {
  if (out.length > 400) return out;
  let s = resolve(schema);
  const ref = schema && schema.$ref;
  if (ref && seen.has(ref)) return out;
  const nextSeen = ref ? new Set([...seen, ref]) : seen;
  if (s.allOf) s = s.allOf.map(resolve).reduce((a, b) => ({ ...a, ...b, properties: { ...a.properties, ...b.properties }, required: [...(a.required || []), ...(b.required || [])] }), {});
  if (s.type === "array" && s.items) {
    if (resolve(s.items).properties && depth > 0) {
      out.push(`${indent}(each item:)`);
      renderSchema(s.items, depth - 1, indent + "  ", nextSeen, out);
    }
    return out;
  }
  if (s.oneOf || s.anyOf) {
    (s.oneOf || s.anyOf).forEach((alt, i) => {
      out.push(`${indent}(option ${i + 1}: ${typeLabel(alt)})`);
      if (depth > 0) renderSchema(alt, depth - 1, indent + "  ", nextSeen, out);
    });
    return out;
  }
  const req = new Set(s.required || []);
  for (const [name, prop] of Object.entries(s.properties || {})) {
    const p = resolve(prop);
    const d = oneLine(p.description || prop.description);
    out.push(`${indent}${name}${req.has(name) ? "" : "?"}: ${typeLabel(prop)}${p.nullable ? " (nullable)" : ""}${d ? ` — ${d}` : ""}`);
    const child = p.type === "array" ? resolve(p.items) : p;
    if (depth > 0 && (child.properties || child.allOf || child.oneOf || child.anyOf)) {
      renderSchema(p.type === "array" ? p.items : prop, depth - 1, indent + "  ", nextSeen, out);
    }
  }
  if (s.additionalProperties && typeof s.additionalProperties === "object" && !s.properties) {
    out.push(`${indent}[key: string]: ${typeLabel(s.additionalProperties)}`);
  }
  return out;
}

function usageExample(op) {
  const args = op.params.filter((p) => p.in === "path" || (p.in === "query" && p.required && p.name !== "pagination")).map((p) => `${p.name}=<${p.name}>`);
  if (op.method === "GET") return `segment read ${op.id}${args.length ? " " + args.join(" ") : ""}`;
  return `segment write ${op.id}${args.length ? " " + args.join(" ") : ""}${op.body ? " --body @body.json" : ""} [--yes]`;
}

export function describeOp(op, depth = 3) {
  const lines = [`${op.method} ${op.path}`, `operationId: ${op.id}`, `Tag: ${op.tag}`, `Summary: ${op.summary}`];
  if (op.deprecated) lines.push("DEPRECATED");
  const versions = op.versions.filter((v) => v !== "json");
  lines.push(
    `Versions: ${versions.join(", ") || "default"}` +
      (op.defaultVersion ? ` — not available unversioned; the CLI sends ${op.defaultVersion} automatically.` : " — the default call uses the most stable version.")
  );
  lines.push(`Usage: ${usageExample(op)}`);
  if (op.description) lines.push("", "Description:", op.description.length > 2500 ? op.description.slice(0, 2500) + "…" : op.description);

  const pathParams = op.params.filter((p) => p.in === "path");
  const queryParams = op.params.filter((p) => p.in === "query");
  if (pathParams.length) {
    lines.push("", "Path params (key=value):");
    for (const p of pathParams) lines.push(`  ${p.name}: ${typeLabel(p.schema)} — ${oneLine(p.description)}`);
  }
  if (queryParams.length) {
    lines.push("", "Query params (key=value; nested values as dotted keys like pagination.count=50, or key='{...json}'):");
    for (const p of queryParams) {
      const ex = p.example !== undefined ? ` (e.g. ${typeof p.example === "string" ? p.example : JSON.stringify(p.example)})` : "";
      lines.push(`  ${p.name}${p.required ? "" : "?"}: ${typeLabel(p.schema)} — ${oneLine(p.description)}${ex}`);
      const r = resolve(p.schema);
      if (r.properties || r.type === "array") renderSchema(p.schema, 1, "    ", new Set(), lines);
    }
  }
  if (op.body) {
    lines.push("", `Request body${op.body.required ? " (required)" : ""}, pass with --body @file.json:`);
    renderSchema(op.body.schema, depth, "  ", new Set(), lines);
    const alpha = op.body.byVersion && op.body.byVersion.v1alpha;
    const main = op.body.schema && op.body.schema.$ref;
    if (alpha && main && alpha !== main) lines.push(`  (The v1alpha body schema differs: ${alpha.split("/").pop()}. Use --api-version alpha for alpha-only fields.)`);
    if (op.body.example !== undefined) lines.push("", "Example body:", JSON.stringify(op.body.example, null, 2).slice(0, 3000));
  }
  if (op.response) {
    lines.push("", "Response shape (data):");
    const data = resolve(op.response).properties && resolve(op.response).properties.data;
    renderSchema(data || op.response, 1, "  ", new Set(), lines);
  }
  return lines.join("\n");
}

export function listTags() {
  const counts = {};
  for (const o of SPEC.operations) counts[o.tag] = (counts[o.tag] || 0) + 1;
  return Object.entries(counts).map(([t, n]) => `  ${t} (${n})`).join("\n");
}

// ---------------------------------------------------------------------------
// Requests

function flatten(value, prefix, out) {
  if (value === undefined || value === null) return out;
  if (Array.isArray(value)) value.forEach((v, i) => flatten(v, `${prefix}.${i}`, out));
  else if (typeof value === "object") for (const [k, v] of Object.entries(value)) flatten(v, `${prefix}.${k}`, out);
  else out.push([prefix, String(value)]);
  return out;
}

function defaultPageSize(op) {
  const p = op.params.find((x) => x.in === "query" && x.name === "pagination");
  if (!p) return null;
  const schema = resolve(p.schema);
  const count = schema.properties && schema.properties.count;
  const desc = (count && count.description) || schema.description || "";
  const m = desc.match(/between 1 and (\d+)/i) || desc.match(/limited to (\d+)/i);
  return Math.min(200, m ? Number(m[1]) : 200);
}

export function buildRequest(op, params = {}, version) {
  const pathNames = new Set(op.params.filter((p) => p.in === "path").map((p) => p.name));
  const queryNames = new Set(op.params.filter((p) => p.in === "query").map((p) => p.name));
  let urlPath = op.path;
  const query = [];
  const unknown = [];
  for (const [key, value] of Object.entries(params)) {
    if (pathNames.has(key)) {
      urlPath = urlPath.replace(`{${key}}`, encodeURIComponent(String(value)));
      pathNames.delete(key);
    } else if (queryNames.has(key.split(".")[0])) {
      flatten(value, key, query);
    } else unknown.push(key);
  }
  if (unknown.length) {
    throw new UserError(`Unknown parameter(s) for ${op.id}: ${unknown.join(", ")}. Valid: ${op.params.map((p) => p.name).join(", ") || "(none)"}. Request body fields go in --body.`);
  }
  if (pathNames.size) throw new UserError(`Missing path parameter(s) for ${op.id}: ${[...pathNames].map((n) => `${n}=<value>`).join(" ")}.`);
  const has = (name) => query.some(([k]) => k === name || k.startsWith(name + "."));
  const pageSize = defaultPageSize(op);
  if (pageSize && !has("pagination")) query.push(["pagination.count", String(pageSize)]);
  const missing = op.params.filter((p) => p.in === "query" && p.required && !has(p.name)).map((p) => p.name);
  if (missing.length) throw new UserError(`Missing required query parameter(s) for ${op.id}: ${missing.join(", ")}. See \`segment describe ${op.id}\`.`);

  let v = op.defaultVersion;
  if (version) {
    v = VERSION_ALIASES[String(version).toLowerCase()];
    if (!v) throw new UserError(`Unknown API version "${version}". Use one of: v1, v2, beta, alpha.`);
    if (!op.versions.includes(v)) throw new UserError(`${op.id} does not offer ${v}. Available: ${op.versions.filter((x) => x !== "json").join(", ")}.`);
  }
  return { method: op.method, path: urlPath, query, version: v };
}

export const urlFor = (baseUrl, req, extra = []) => {
  const qs = [...req.query, ...extra].map(([k, val]) => `${encodeURIComponent(k).replace(/%2E/g, ".")}=${encodeURIComponent(val)}`).join("&");
  return `${baseUrl}${req.path}${qs ? "?" + qs : ""}`;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function send({ baseUrl, token }, req, body, extraQuery = []) {
  const accept = req.version ? mediaType(req.version) : "application/json";
  const headers = { Authorization: `Bearer ${token}`, Accept: accept, "User-Agent": USER_AGENT };
  if (body !== undefined) headers["Content-Type"] = accept;
  const url = urlFor(baseUrl, req, extraQuery);
  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await fetch(url, { method: req.method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(90000) });
    } catch (e) {
      if (attempt < 3 && req.method === "GET") {
        await sleep(1000 * attempt);
        continue;
      }
      throw new UserError(`Network error calling ${req.method} ${url}: ${e.cause ? e.cause.message || e.cause.code : e.message}`, 1);
    }
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text.slice(0, 2000) };
    }
    if (res.status === 429 && attempt < 4) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const wait = retryAfter ? retryAfter * 1000 : (json && json.data && json.data.msBeforeNext) || 2000 * attempt;
      info(`Rate limited on ${req.method} ${req.path}; retrying in ${Math.ceil(wait / 1000)}s…`);
      await sleep(Math.min(wait, 60000));
      continue;
    }
    if ([502, 503, 504].includes(res.status) && req.method === "GET" && attempt < 3) {
      await sleep(1000 * attempt);
      continue;
    }
    return { status: res.status, statusText: res.statusText, json };
  }
}

export function errorText(op, r) {
  const hints = {
    401: "The token was rejected. Run `segment auth status` to check it, or `segment auth login` to replace it.",
    403: "The token's role lacks permission for this resource, or the workspace lacks this feature (Protocols, Engage, Functions).",
    404: "Not found. Check the IDs with the matching list operation. For an EU workspace, check the profile's region in `segment auth status`.",
    409: "Conflict: the resource may already exist or be in a conflicting state.",
    422: "Validation failed. Read the field errors above, then check `segment describe " + op.id + "`.",
    429: "Still rate limited after retries. Wait a minute, or fetch fewer pages.",
  };
  return [`HTTP ${r.status} ${r.statusText} from ${op.method} ${op.path} (${op.id})`, JSON.stringify(r.json, null, 1), hints[r.status] || ""].filter(Boolean).join("\n");
}

// ---------------------------------------------------------------------------
// Response shaping

export function listKey(data) {
  if (!data || typeof data !== "object") return null;
  const keys = Object.keys(data).filter((k) => Array.isArray(data[k]));
  return keys.length === 1 ? keys[0] : null;
}

const getPath = (obj, p) => p.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
const pick = (obj, fields) => Object.fromEntries(fields.map((f) => [f, getPath(obj, f)]));

export function project(payload, fields) {
  if (!fields || !fields.length || !payload || !payload.data) return payload;
  const data = { ...payload.data };
  const key = listKey(data);
  if (key) data[key] = data[key].map((item) => pick(item, fields));
  else {
    const objKeys = Object.keys(data).filter((k) => data[k] && typeof data[k] === "object" && k !== "pagination");
    if (objKeys.length === 1) data[objKeys[0]] = pick(data[objKeys[0]], fields);
  }
  return { ...payload, data };
}
