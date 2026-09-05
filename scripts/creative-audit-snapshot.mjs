import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const roots = ["src/app", "src/components"];
const exact = ["src/app/globals.css"];
const extensions = new Set([".tsx", ".ts", ".css"]);

function walk(root) {
  try {
    return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
      const file = join(root, entry.name);
      if (entry.isDirectory()) return walk(file);
      const ext = entry.name.slice(entry.name.lastIndexOf("."));
      return extensions.has(ext) ? [file] : [];
    });
  } catch {
    return [];
  }
}

const files = [...new Set([...roots.flatMap(walk), ...exact])].sort();
const sources = Object.fromEntries(files.map((file) => [relative(process.cwd(), file).replaceAll("\\", "/"), readFileSync(file, "utf8")]));
const output = "src/lib/travelBrain/creativeAuditSnapshot.json";
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), files: sources }, null, 2));
console.log(`Creative audit snapshot: ${files.length} source files`);
