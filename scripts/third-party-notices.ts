import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Collect the licence of every package that ships with the app.
 *
 * Shipping minified JavaScript to a browser is distribution, and every
 * permissive licence in this tree asks for the same thing in return: that its
 * copyright and permission notice travel with the copy. This writes them into
 * one file the app serves, so the obligation is met once rather than per
 * dependency.
 *
 * The lockfile rather than `npm ls`: its keys are the directories themselves,
 * so a package installed twice at two versions is read from the right one, and
 * `dev` says exactly what never reaches a user.
 *
 * Run after any dependency change: `npm run notices`.
 */

interface LockEntry {
  version?: string;
  dev?: boolean;
  license?: string;
}

export interface Notice {
  name: string;
  version: string;
  license: string;
  /** The licence file as shipped, or an empty string when the package has none. */
  text: string;
}

/** Packages spell it LICENSE, license.md, LICENCE, COPYING — and any casing of those. */
const LICENSE_FILE = /^(licen[cs]e|copying|notice)/i;

const OUTPUT = join(process.cwd(), "src/app/legal/third-party/notices.json");

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

function manifestOf(dir: string): Record<string, unknown> {
  try {
    return readJson(join(process.cwd(), dir, "package.json"));
  } catch {
    return {};
  }
}

function licenseText(dir: string): string {
  try {
    const files = readdirSync(join(process.cwd(), dir)).filter((f) => LICENSE_FILE.test(f)).sort();
    return files
      .map((f) => readFileSync(join(process.cwd(), dir, f), "utf8").trim())
      .join("\n\n")
      .trim();
  } catch {
    return "";
  }
}

/** What the package says it is, whichever of the two fields it says it in. */
function declaredLicense(manifest: Record<string, unknown>, entry: LockEntry): string {
  const own = manifest.license ?? entry.license;
  if (typeof own === "string") return own;
  if (own && typeof own === "object" && "type" in own) return String(own.type);
  const list = manifest.licenses;
  if (Array.isArray(list)) return list.map((l) => String(l.type ?? l)).join(" OR ");
  return "UNKNOWN";
}

export function collectNotices(lockfile: string): Notice[] {
  const lock = readJson(lockfile) as { packages?: Record<string, LockEntry> };
  const notices = Object.entries(lock.packages ?? {})
    .filter(([path, entry]) => path.startsWith("node_modules/") && entry.dev !== true)
    .map(([path, entry]) => {
      // A package for another platform is in the lockfile but not on this disk.
      // It is listed anyway: an image built elsewhere ships it, and the
      // lockfile knows its licence even when the files are absent.
      const manifest = manifestOf(path);
      return {
        name: path.slice(path.lastIndexOf("node_modules/") + "node_modules/".length),
        version: String(manifest.version ?? entry.version ?? ""),
        license: declaredLicense(manifest, entry),
        text: licenseText(path),
      };
    });
  return notices.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
}

const notices = collectNotices(join(process.cwd(), "package-lock.json"));
writeFileSync(OUTPUT, `${JSON.stringify(notices, null, 2)}\n`);

const missing = notices.filter((n) => n.text === "");
console.log(`${notices.length} packages written to ${OUTPUT}`);
if (missing.length > 0) {
  console.log(`${missing.length} ship no licence file: ${missing.map((n) => n.name).join(", ")}`);
}
