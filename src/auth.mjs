// Profiles, token storage and token prompts for the Segment CLI.
//
// Config:      <config dir>/config.json       profiles (workspace, region, read-only) and the active profile
// Credentials: OS credential store when available:
//   Windows  DPAPI (encrypted to the current Windows user) in <config dir>/credentials.json
//   macOS    Keychain (`security`)
//   Linux    Secret Service (`secret-tool`, libsecret)
//   fallback <config dir>/credentials.json in plaintext with owner-only permissions

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { UserError } from "./api.mjs";

const SERVICE = "segment-cli";

export function configDir(override) {
  if (override) return path.resolve(override);
  if (process.platform === "win32") return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "segment-cli");
  return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "segment-cli");
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return fallback;
    throw new UserError(`Could not read ${file}: ${e.message}`, 3);
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  try {
    fs.chmodSync(file, 0o600);
  } catch {}
}

export const loadConfig = (dir) => readJson(path.join(dir, "config.json"), { active: null, profiles: {} });
export const saveConfig = (dir, cfg) => writeJson(path.join(dir, "config.json"), cfg);
const credFile = (dir) => path.join(dir, "credentials.json");

// ---------------------------------------------------------------------------
// Credential backends

function run(cmd, args, input, timeout = 30000) {
  const r = spawnSync(cmd, args, { input, encoding: "utf8", windowsHide: true, timeout });
  return { ok: !r.error && r.status === 0, stdout: (r.stdout || "").trim(), stderr: (r.stderr || r.error?.message || "").trim(), status: r.status };
}

const hasCommand = (cmd) => process.platform !== "win32" && run("sh", ["-c", `command -v ${cmd}`]).ok;

// Windows PowerShell 5.1 ships with every supported Windows version and exposes DPAPI.
// Input arrives on stdin so the token never appears in a process command line.
const ps = (script, input) => run("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script], input);
const PS_DPAPI = (op) =>
  "$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Security; " +
  "$e=[Text.Encoding]::UTF8.GetBytes('segment-cli'); $s=[Console]::In.ReadToEnd().Trim(); " +
  (op === "protect"
    ? "$o=[Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($s),$e,'CurrentUser'); [Console]::Out.Write([Convert]::ToBase64String($o))"
    : "$o=[Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($s),$e,'CurrentUser'); [Console]::Out.Write([Text.Encoding]::UTF8.GetString($o))");

function setCred(dir, profile, entry) {
  const creds = readJson(credFile(dir), {});
  if (entry) creds[profile] = entry;
  else delete creds[profile];
  writeJson(credFile(dir), creds);
}
const getCred = (dir, profile) => readJson(credFile(dir), {})[profile];

export const BACKENDS = {
  dpapi: {
    label: "Windows DPAPI (encrypted to your Windows user)",
    available: () => process.platform === "win32",
    store(dir, profile, token) {
      const r = ps(PS_DPAPI("protect"), token);
      if (!r.ok || !r.stdout) throw new Error(r.stderr || "DPAPI encryption failed");
      setCred(dir, profile, { backend: "dpapi", blob: r.stdout });
    },
    load(dir, profile) {
      const entry = getCred(dir, profile);
      if (!entry || !entry.blob) return null;
      const r = ps(PS_DPAPI("unprotect"), entry.blob);
      if (!r.ok) throw new Error(r.stderr || "DPAPI decryption failed");
      return r.stdout;
    },
    remove: (dir, profile) => setCred(dir, profile, null),
  },
  keychain: {
    label: "macOS Keychain",
    available: () => process.platform === "darwin" && fs.existsSync("/usr/bin/security"),
    store(dir, profile, token) {
      const r = run("/usr/bin/security", ["add-generic-password", "-U", "-s", SERVICE, "-a", profile, "-l", `Segment CLI (${profile})`, "-w", token]);
      if (!r.ok) throw new Error(r.stderr || "Keychain write failed");
    },
    load(dir, profile) {
      const r = run("/usr/bin/security", ["find-generic-password", "-s", SERVICE, "-a", profile, "-w"]);
      return r.ok ? r.stdout : null;
    },
    remove: (dir, profile) => run("/usr/bin/security", ["delete-generic-password", "-s", SERVICE, "-a", profile]),
  },
  "secret-service": {
    label: "Secret Service (libsecret)",
    available: () => process.platform === "linux" && hasCommand("secret-tool"),
    store(dir, profile, token) {
      const r = run("secret-tool", ["store", "--label", `Segment CLI (${profile})`, "service", SERVICE, "account", profile], token);
      if (!r.ok) throw new Error(r.stderr || "secret-tool store failed");
    },
    load(dir, profile) {
      const r = run("secret-tool", ["lookup", "service", SERVICE, "account", profile]);
      return r.ok ? r.stdout : null;
    },
    remove: (dir, profile) => run("secret-tool", ["clear", "service", SERVICE, "account", profile]),
  },
  file: {
    label: "plaintext file with owner-only permissions",
    available: () => true,
    store: (dir, profile, token) => setCred(dir, profile, { backend: "file", token }),
    load: (dir, profile) => (getCred(dir, profile) || {}).token || null,
    remove: (dir, profile) => setCred(dir, profile, null),
  },
};

// Store a token, preferring the OS credential store. Returns the backend name used.
export function storeToken(dir, profile, token, { insecure = false } = {}) {
  const order = insecure ? ["file"] : ["dpapi", "keychain", "secret-service", "file"];
  const errors = [];
  for (const name of order) {
    const b = BACKENDS[name];
    if (!b.available()) continue;
    try {
      b.store(dir, profile, token);
      if (name === "file" && !insecure) {
        process.stderr.write(
          `Warning: no OS credential store was usable${errors.length ? ` (${errors.join("; ")})` : ""}. ` +
            `The token is saved in ${credFile(dir)} with owner-only permissions.\n`
        );
      }
      return name;
    } catch (e) {
      errors.push(`${name}: ${e.message.split("\n")[0]}`);
    }
  }
  throw new UserError(`Could not store the token: ${errors.join("; ")}`, 3);
}

export function loadToken(dir, profileName, profile) {
  const b = BACKENDS[profile.storage];
  if (!b) throw new UserError(`Profile "${profileName}" uses an unknown credential store "${profile.storage}". Run \`segment auth login\` again.`, 3);
  let token;
  try {
    token = b.load(dir, profileName);
  } catch (e) {
    throw new UserError(`Could not read the token for "${profileName}" from ${b.label}: ${e.message.split("\n")[0]}. Run \`segment auth login\` again.`, 3);
  }
  if (!token) throw new UserError(`No stored token for profile "${profileName}" in ${b.label}. Run \`segment auth login\` again.`, 3);
  return token;
}

export function removeToken(dir, profileName, profile) {
  const b = BACKENDS[profile.storage];
  if (b) b.remove(dir, profileName);
}

// ---------------------------------------------------------------------------
// Token input

export async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

const stripPaste = (s) => s.replace(/\x1b\[20[01]~/g, "").trim();

// Hidden prompt in an interactive terminal.
export function promptHidden(question) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    process.stderr.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      process.stderr.write("\n");
    };
    function onData(chunk) {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n" || ch === "\u0004") {
          cleanup();
          return resolve(stripPaste(value));
        }
        if (ch === "\u0003") {
          cleanup();
          return reject(new UserError("Cancelled.", 130));
        }
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
        else value += ch;
      }
    }
    stdin.on("data", onData);
  });
}
