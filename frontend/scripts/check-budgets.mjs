#!/usr/bin/env node
// Size budgets for the production build (see docs/MOTION-PLAN.md §5).
// Run after `vite build`: `npm run budgets`. Exits 1 if any budget is exceeded.
// Uses only Node built-ins: reads dist/.vite/manifest.json to know which chunks each
// entry point pulls in, and gzips them to measure what the browser actually downloads.
import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const DIST = path.resolve(import.meta.dirname, "../dist");
const KB = 1024;
const manifest = JSON.parse(fs.readFileSync(path.join(DIST, ".vite/manifest.json"), "utf8"));

const gz = (file) => gzipSync(fs.readFileSync(path.join(DIST, file)), { level: 9 }).length;

/** Every JS file a manifest entry loads statically (the entry itself + its static imports). */
function closure(key, seen = new Set()) {
  const chunk = manifest[key];
  if (!chunk || seen.has(chunk.file)) return seen;
  seen.add(chunk.file);
  for (const imported of chunk.imports ?? []) closure(imported, seen);
  return seen;
}
const sum = (files) => [...files].reduce((total, file) => total + gz(file), 0);

const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);
const critical = closure(entryKey);
/** JS a lazy module adds on top of what the critical bundle already loaded. */
const lazyCost = (src) =>
  manifest[src] ? sum([...closure(src)].filter((file) => !critical.has(file))) : null;

const results = [
  ["Critical JS (index + static imports)", sum(critical), 110 * KB],
  ["Motion features chunk (async)", lazyCost("src/lib/motion-features.ts"), 35 * KB],
  ["Landing enhancements chunk", lazyCost("src/features/site/motion/Enhancements.tsx"), 25 * KB],
  ["Route / (below-the-fold sections)", lazyCost("src/features/site/LandingSections.tsx"), 35 * KB],
  ["Route /book", lazyCost("src/features/booking/BookingPage.tsx"), 50 * KB],
  ["Route /login", lazyCost("src/features/auth/LoginPage.tsx"), 45 * KB],
  [
    "CSS",
    fs
      .readdirSync(path.join(DIST, "assets"))
      .filter((file) => file.endsWith(".css"))
      .reduce((total, file) => total + gz(`assets/${file}`), 0),
    15 * KB,
  ],
];

// Images: each file ≤ 120 KB; the landing total counts the largest variant of each photo
// (the worst case a browser could download).
const imgDir = path.join(DIST, "img");
const images = fs.existsSync(imgDir)
  ? fs.readdirSync(imgDir).filter((f) => /\.(avif|webp|jpe?g|png)$/.test(f))
  : [];
const largest = {};
let failed = false;
for (const file of images) {
  const size = fs.statSync(path.join(imgDir, file)).size;
  const photo = file.replace(/-\d+w\.\w+$/, "");
  largest[photo] = Math.max(largest[photo] ?? 0, size);
  if (size > 120 * KB) {
    console.log(`FAIL  image ${file}: ${(size / KB).toFixed(1)} KB > 120 KB`);
    failed = true;
  }
}
results.push([
  "Landing images (largest variant each)",
  Object.values(largest).reduce((a, b) => a + b, 0),
  600 * KB,
]);

for (const [name, size, budget] of results) {
  if (size === null) {
    console.log(`n/a   ${name.padEnd(40)} (not in this build)`);
    continue;
  }
  const ok = size <= budget;
  failed ||= !ok;
  console.log(
    // Images are measured as files (already compressed formats); everything else gzipped.
    `${ok ? "ok  " : "FAIL"}  ${name.padEnd(40)} ${(size / KB).toFixed(1).padStart(6)} KB${name.includes("images") ? "   " : " gz"} / ${budget / KB} KB`,
  );
}
process.exit(failed ? 1 : 0);
