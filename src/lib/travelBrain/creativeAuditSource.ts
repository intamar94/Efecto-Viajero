import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src/app", "src/components"];
const EXACT_FILES = ["src/app/globals.css"];
const SNAPSHOT = "src/lib/travelBrain/creativeAuditSnapshot.json";
const ALLOWED_EXTENSIONS = new Set([".tsx", ".ts", ".css"]);

type Snapshot = { version: 1; generatedAt: string; files: Record<string, string> };

function collectTree(root: string): string[] {
  try {
    return readdirSync(join(process.cwd(), root), { withFileTypes: true }).flatMap((entry) => {
      const path = join(root, entry.name);
      if (entry.isDirectory()) return collectTree(path);
      const extension = entry.name.slice(entry.name.lastIndexOf("."));
      return ALLOWED_EXTENSIONS.has(extension) ? [path.replaceAll("\\", "/")] : [];
    });
  } catch {
    return [];
  }
}

export function getCreativeAuditSurfaces(): string[] {
  if (existsSync(join(process.cwd(), SNAPSHOT))) {
    try {
      const snapshot = JSON.parse(readFileSync(join(process.cwd(), SNAPSHOT), "utf8")) as Snapshot;
      if (snapshot.version === 1 && snapshot.files) return Object.keys(snapshot.files).sort();
    } catch {
      // Fall back to the live source tree.
    }
  }
  return [...new Set([...ROOTS.flatMap(collectTree), ...EXACT_FILES])].sort();
}

export function collectCreativeAuditSources(): Record<string, string> {
  const snapshotPath = join(process.cwd(), SNAPSHOT);
  if (existsSync(snapshotPath)) {
    try {
      const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8")) as Snapshot;
      if (snapshot.version === 1 && snapshot.files) return snapshot.files;
    } catch {
      // Fall through to the live tree.
    }
  }

  const sources: Record<string, string> = {};
  for (const relativePath of getCreativeAuditSurfaces()) {
    try { sources[relativePath] = readFileSync(join(process.cwd(), relativePath), "utf8"); } catch { /* omit unavailable source */ }
  }
  return sources;
}
