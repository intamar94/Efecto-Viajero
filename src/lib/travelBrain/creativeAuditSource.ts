import snapshotData from "./creativeAuditSnapshot.json";

type Snapshot = { version: 1; generatedAt: string; files: Record<string, string> };

const snapshot = snapshotData as Snapshot;

export function getCreativeAuditSurfaces(): string[] {
  if (snapshot.version === 1 && snapshot.files) return Object.keys(snapshot.files).sort();
  return [];
}

export function collectCreativeAuditSources(): Record<string, string> {
  if (snapshot.version === 1 && snapshot.files) return snapshot.files;
  return {};
}
