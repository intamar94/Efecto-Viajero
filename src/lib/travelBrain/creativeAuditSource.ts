import { readFileSync } from "node:fs";
import { join } from "node:path";

const AUDIT_FILES = [
  "src/app/page.tsx",
  "src/app/planificar/page.tsx",
  "src/app/cerebro/page.tsx",
  "src/app/viajes/[id]/page.tsx",
  "src/app/viajes/[id]/decisiones/page.tsx",
  "src/app/viajes/[id]/itinerario/page.tsx",
  "src/app/viajes/[id]/alojamiento/page.tsx",
  "src/app/viajes/[id]/transporte/page.tsx",
  "src/app/viajes/[id]/actividades/page.tsx",
  "src/app/globals.css",
];

export function collectCreativeAuditSources(): Record<string, string> {
  const sources: Record<string, string> = {};
  for (const relativePath of AUDIT_FILES) {
    try {
      sources[relativePath] = readFileSync(join(process.cwd(), relativePath), "utf8");
    } catch {
      // A deployment may not ship source files. Missing snapshots are intentionally omitted
      // so the audit never presents a static heuristic as a verified runtime observation.
    }
  }
  return sources;
}

export function getCreativeAuditSurfaces(): string[] {
  return [...AUDIT_FILES];
}
