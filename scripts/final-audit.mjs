import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
const roots = ["src/app", "src/components"];
const files = [];
function walk(root) { if (!existsSync(root)) return; for (const entry of readdirSync(root, { withFileTypes: true })) { const path = join(root, entry.name); if (entry.isDirectory()) walk(path); else if (/\.(tsx|ts|css)$/.test(entry.name)) files.push(path); } }
roots.forEach(walk);
const source = files.map((file) => ({ file, text: readFileSync(file, "utf8") }));
const traveler = source.filter(({ file }) => /^src\/app\/(page|planificar|cerebro)/.test(file));
const directStatusColors = source.filter(({ text }) => /\b(?:bg|text|border)-(?:red|green|emerald|amber|yellow|orange)-(?:50|100|200|300|400|500|600|700|800|900)\b/.test(text));
const technicalLeak = traveler.filter(({ file, text }) => !file.endsWith("/cerebro/page.tsx") && /BrainState|BrainController|agentResults|providerRegistry|orchestrator/i.test(text));
const semanticComponent = existsSync("src/components/TravelStatus.tsx");
const snapshotGenerator = existsSync("scripts/creative-audit-snapshot.mjs");
const browserAudit = existsSync("scripts/browser-audit.mjs");
const failures = [];
if (!semanticComponent) failures.push("TravelStatus component missing");
if (!snapshotGenerator) failures.push("creative audit snapshot generator missing");
if (!browserAudit) failures.push("browser audit missing");
console.log(JSON.stringify({ files: source.length, directStatusColorFiles: directStatusColors.map((item) => item.file), travelerTechnicalLeaks: technicalLeak.map((item) => item.file), semanticComponent, snapshotGenerator, browserAudit, failures }, null, 2));
if (failures.length) process.exit(1);
