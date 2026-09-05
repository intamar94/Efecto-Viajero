import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["src/app", "src/components"];
const EXACT_FILES = ["src/app/globals.css"];
const ALLOWED_EXTENSIONS = new Set([".tsx", ".ts", ".css"]);

function collectTree(root: string, base = root): string[] {
  try {
    return readdirSync(join(process.cwd(), root), { withFileTypes: true }).flatMap((entry) => {
      const path = join(root, entry.name);
      if (entry.isDirectory()) return collectTree(path, base);
      const extension = entry.name.slice(entry.name.lastIndexOf("."));
      return ALLOWED_EXTENSIONS.has(extension) ? [relative(process.cwd(), join(process.cwd(), path)).replaceAll("\\", "/")] : [];
    });
  } catch {
    return [];
  }
}

export function getCreativeAuditSurfaces(): string[] {
  return [...new Set([...ROOTS.flatMap((root) => collectTree(root)), ...EXACT_FILES])].sort();
}

export function collectCreativeAuditSources(): Record<string, string> {
  const sources: Record<string, string> = {};
  for (const relativePath of getCreativeAuditSurfaces()) {
    try {
      sources[relativePath] = readFileSync(join(process.cwd(), relativePath), "utf8");
    } catch {
      // Missing source is omitted; the audit must not present it as inspected.
    }
  }
  return sources;
}
