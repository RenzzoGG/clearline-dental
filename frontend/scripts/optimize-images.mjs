#!/usr/bin/env node
// Converts the landing's stock photos to AVIF + WebP at a few widths (npm run images).
//
// Originals are not committed: download them into .cache/images-src/ (git-ignored) from the
// Unsplash pages listed in src/features/site/photo-credits.ts, then run this script. It
// writes public/img/<name>-<width>w.{avif,webp}, which are committed and served as-is.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, ".cache/images-src");
const OUT = path.join(ROOT, "public/img");

/** name: output prefix; aspect: crop (w/h); top: optional manual crop start (fraction of
 * the original height, full width); widths: srcset candidates. */
const PHOTOS = [
  { name: "clinic-room", source: "clinic-room.jpg", aspect: 3 / 2, widths: [640, 960, 1440] },
  { name: "clinic-detail", source: "clinic-detail.jpg", aspect: 4 / 5, widths: [480, 720, 960] },
  // Portrait original: a manual 3:2 crop from 12% of its height keeps both masked
  // professionals and the procedure in frame (automatic "attention" picked the patient's arm).
  {
    name: "team-at-work",
    source: "team-at-work.jpg",
    aspect: 3 / 2,
    top: 0.12,
    widths: [640, 1024, 1600],
  },
];

fs.mkdirSync(OUT, { recursive: true });
for (const photo of PHOTOS) {
  const input = path.join(SRC, photo.source);
  if (!fs.existsSync(input)) {
    console.error(`missing ${input} (see photo-credits.ts for the source page)`);
    process.exitCode = 1;
    continue;
  }
  for (const width of photo.widths) {
    const height = Math.round(width / photo.aspect);
    let base = sharp(input);
    if (photo.top !== undefined) {
      const meta = await sharp(input).metadata();
      const cropHeight = Math.round(meta.width / photo.aspect);
      const top = Math.min(Math.round(meta.height * photo.top), meta.height - cropHeight);
      base = base.extract({ left: 0, top, width: meta.width, height: cropHeight });
    }
    base = base.resize(width, height, { fit: "cover", position: sharp.strategy.attention });
    const avif = path.join(OUT, `${photo.name}-${width}w.avif`);
    const webp = path.join(OUT, `${photo.name}-${width}w.webp`);
    await base.clone().avif({ quality: 50, effort: 6 }).toFile(avif);
    await base.clone().webp({ quality: 72, effort: 6 }).toFile(webp);
    const kb = (file) => (fs.statSync(file).size / 1024).toFixed(1);
    console.log(`${photo.name} ${width}x${height}: avif ${kb(avif)} KB, webp ${kb(webp)} KB`);
  }
}
