#!/usr/bin/env node
// Upwork portfolio images (Phase 7): 1600x1200 PNG composites built from docs/screenshots/.
//
//   node scripts/upwork-composites.mjs [--shots DIR] [--out DIR]
//
// Each image is an inline HTML template (brand background, CSS-drawn browser/phone frames,
// short caption) rendered by Playwright's Chromium. Output goes to docs/upwork/, which is
// git-ignored: the images are uploaded to Upwork, not committed. Run
// capture-screenshots.mjs first.
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "@playwright/test";

const REPO = path.resolve(import.meta.dirname, "../..");
const { values: args } = parseArgs({
  options: {
    shots: { type: "string", default: path.join(REPO, "docs/screenshots") },
    out: { type: "string", default: path.join(REPO, "docs/upwork") },
  },
});
fs.mkdirSync(args.out, { recursive: true });

/** A screenshot as a data URI, so the template needs no file server. */
const img = (name) =>
  `data:image/webp;base64,${fs.readFileSync(path.join(args.shots, `${name}.webp`)).toString("base64")}`;

const FONTS =
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;1,400&family=Plus+Jakarta+Sans:wght@400..800&display=block";

const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; }
  body { width: 1600px; height: 1200px; overflow: hidden; font-family: "Plus Jakarta Sans", sans-serif;
    color: #0b3b37; background:
      radial-gradient(900px 700px at 100% 0%, #c3ecd9 0%, transparent 60%),
      radial-gradient(800px 600px at 0% 100%, #ffe4dc 0%, transparent 55%), #f2fbf7; }
  .stage { position: relative; width: 100%; height: 100%; padding: 72px 80px; }
  .eyebrow { font-size: 20px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #227a70; }
  h1 { font-family: "Fraunces", serif; font-weight: 400; font-size: 64px; line-height: 1.05; margin-top: 14px; letter-spacing: -.01em; }
  h1 em { color: #227a70; }
  .caption { font-size: 24px; line-height: 1.45; color: #3a444c; margin-top: 16px; max-width: 900px; }
  .browser { position: absolute; border-radius: 18px; overflow: hidden; background: #fff;
    box-shadow: 0 40px 80px -30px rgba(6,37,35,.45), 0 0 0 1px rgba(11,59,55,.08); }
  .bar { height: 44px; display: flex; align-items: center; gap: 8px; padding: 0 18px; background: #eceff2; }
  .dot { width: 12px; height: 12px; border-radius: 50%; background: #b7c1c9; }
  .dot:nth-child(1) { background: #f4704f; } .dot:nth-child(2) { background: #f5c451; } .dot:nth-child(3) { background: #4cb3a5; }
  .url { margin-left: 16px; flex: 1; height: 26px; border-radius: 13px; background: #fff; font-size: 14px;
    color: #66747f; display: flex; align-items: center; padding-left: 14px; }
  .browser img, .phone img { display: block; width: 100%; }
  .phone { position: absolute; border-radius: 46px; padding: 12px; background: #0b1f1d; overflow: hidden;
    box-shadow: 0 40px 80px -24px rgba(6,37,35,.55); }
  .phone img { border-radius: 34px; }
  .tag { position: absolute; z-index: 5; padding: 10px 18px; border-radius: 999px; background: #0b3b37; color: #fff;
    font-size: 18px; font-weight: 700; box-shadow: 0 12px 30px -12px rgba(6,37,35,.6); }
  .tag.coral { background: #c4472a; }
`;

const browser = (src, url, style) =>
  `<div class="browser" style="${style}"><div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="url">${url}</span></div><img src="${img(src)}"></div>`;
const phone = (src, style) => `<div class="phone" style="${style}"><img src="${img(src)}"></div>`;
const tag = (text, style, extra = "") => `<div class="tag ${extra}" style="${style}">${text}</div>`;

const PAGES = {
  "01-cover": `
    <div class="stage">
      <div class="eyebrow">Full-stack web app · Live demo</div>
      <h1>Clearline Dental: <em>online booking</em><br>and a front-desk dashboard</h1>
      <p class="caption">Django REST API + React/TypeScript SPA, tested end to end and deployed on Railway.</p>
      ${tag("Django · DRF · PostgreSQL", "left:80px; top:360px;")}
      ${tag("React · TypeScript · Motion", "left:390px; top:360px;", "coral")}
      ${browser("landing-hero", "clearline.renzzogg.com", "left:80px; top:450px; width:1100px;")}
      ${phone("mobile-landing-hero", "left:1170px; top:400px; width:340px;")}
    </div>`,
  "02-booking-flow": `
    <div class="stage">
      <div class="eyebrow">Patient booking flow</div>
      <h1>Book a visit in <em>five steps</em></h1>
      <p class="caption">Live availability per dentist, no double bookings (enforced by Postgres), works on any phone.</p>
      ${browser("booking-availability", "clearline.renzzogg.com/book", "left:80px; top:350px; width:900px;")}
      ${browser("patient-booked", "clearline.renzzogg.com/book", "left:600px; top:690px; width:620px;")}
      ${phone("mobile-booking-availability", "left:1200px; top:300px; width:330px;")}
      ${tag("① Pick a time", "left:96px; top:300px;")}
      ${tag("② Confirmed", "left:1000px; top:636px;", "coral")}
    </div>`,
  "03-dashboards": `
    <div class="stage">
      <div class="eyebrow">Front-desk dashboard</div>
      <h1>Schedule and <em>insights</em> for the clinic</h1>
      <p class="caption">Week and day views by dentist, one-click confirm / complete / cancel, and charts with Recharts.</p>
      ${browser("reception-schedule", "clearline.renzzogg.com/dashboard", "left:80px; top:350px; width:980px;")}
      ${browser("reception-insights", "clearline.renzzogg.com/dashboard/insights", "left:640px; top:700px; width:640px;")}
      ${phone("mobile-reception-schedule", "left:1210px; top:300px; width:320px;")}
    </div>`,
  "04-architecture-tech": `
    <style>
      .node { position: absolute; z-index: 3; border-radius: 18px; background: #fff; padding: 20px 24px; font-size: 22px;
        line-height: 1.35; box-shadow: 0 20px 40px -24px rgba(6,37,35,.45), 0 0 0 1px rgba(11,59,55,.1); text-align: center; }
      .node b { display: block; font-size: 24px; }
      .node small { display: block; color: #66747f; font-size: 18px; margin-top: 4px; }
      .rail { position: absolute; left: 700px; top: 330px; width: 820px; height: 560px; border-radius: 26px;
        border: 3px dashed #4cb3a5; background: rgba(239,250,248,.7); z-index: 1; }
      .rail span { position: absolute; left: 24px; top: 14px; font-weight: 800; color: #227a70; font-size: 20px; letter-spacing: .1em; text-transform: uppercase; }
      .arrow { position: absolute; z-index: 2; height: 4px; background: #227a70; border-radius: 2px; }
      .arrow::after { content: ""; position: absolute; right: -4px; top: -8px; border: 10px solid transparent; border-left: 14px solid #227a70; border-right: 0; }
      .vline { position: absolute; z-index: 2; width: 4px; background: #227a70; border-radius: 2px; }
      .vline.up { z-index: 4; }
      .vline.up::after { content: ""; position: absolute; left: -8px; top: -8px; border: 10px solid transparent; border-bottom: 14px solid #227a70; border-top: 0; }
      .alabel { position: absolute; z-index: 4; padding: 0 4px; background: #f2fbf7; font-size: 17px; font-weight: 700; color: #227a70; }
      .chips { position: absolute; left: 80px; top: 940px; right: 80px; display: flex; flex-wrap: wrap; gap: 14px; }
      .chip { padding: 12px 20px; border-radius: 999px; background: #fff; font-size: 20px; font-weight: 600;
        box-shadow: 0 0 0 1px rgba(11,59,55,.12); }
      .chip.k { background: #0b3b37; color: #fff; }
    </style>
    <div class="stage">
      <div class="eyebrow">Architecture & engineering</div>
      <h1>One container, <em>one domain</em>, CI-gated deploys</h1>
      <p class="caption">Django serves the API, the admin and the built React app from the same origin.</p>

      <div class="node" style="left:80px; top:380px; width:220px;"><b>Browser</b><small>desktop & mobile</small></div>
      <div class="arrow" style="left:300px; top:428px; width:70px;"></div>
      <div class="node" style="left:380px; top:380px; width:250px;"><b>Cloudflare</b><small>DNS only</small></div>
      <div class="arrow" style="left:630px; top:428px; width:100px;"></div>

      <div class="node" style="left:80px; top:600px; width:220px;"><b>git push</b><small>GitHub</small></div>
      <div class="arrow" style="left:300px; top:648px; width:70px;"></div>
      <div class="node" style="left:380px; top:580px; width:250px;"><b>GitHub Actions</b><small>lint · tests · build · E2E</small></div>
      <div class="arrow" style="left:630px; top:648px; width:100px;"></div>
      <div class="alabel" style="left:620px; top:612px;">Wait for CI</div>

      <div class="rail"><span>Railway</span></div>
      <div class="node" style="left:740px; top:380px; width:440px; height:300px; display:flex; flex-direction:column; justify-content:center;"><b>web service</b><small>gunicorn + Django + DRF<br>React SPA via WhiteNoise<br>/api · /admin · the site</small></div>
      <div class="arrow" style="left:1180px; top:528px; width:80px;"></div>
      <div class="node" style="left:1270px; top:470px; width:220px;"><b>PostgreSQL</b><small>overlap-proof bookings</small></div>
      <div class="node" style="left:740px; top:740px; width:440px;"><b>demo-reset</b><small>nightly cron · same image</small></div>
      <div class="vline" style="left:1180px; top:790px; width:202px; height:4px;"></div>
      <div class="vline up" style="left:1378px; top:604px; height:190px;"></div>

      <div class="chips">
        <span class="chip k">98% backend test coverage</span>
        <span class="chip k">Lighthouse 100 accessibility</span>
        <span class="chip k">JWT rotation + blacklist</span>
        <span class="chip">Python 3.13 · Django 5.2</span><span class="chip">Django REST Framework</span>
        <span class="chip">PostgreSQL 17</span><span class="chip">React 19 · TypeScript</span>
        <span class="chip">Vite · Tailwind v4</span><span class="chip">Motion</span><span class="chip">TanStack Query</span>
        <span class="chip">pytest · Vitest · Playwright</span><span class="chip">Docker · GitHub Actions · Railway</span>
        <span class="chip">OpenAPI / Swagger</span>
      </div>
    </div>`,
};

const chromiumBrowser = await chromium.launch();
try {
  const page = await chromiumBrowser.newPage({
    viewport: { width: 1600, height: 1200 },
    deviceScaleFactor: 1,
  });
  for (const [name, body] of Object.entries(PAGES)) {
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>${BASE_CSS}</style></head><body>${body}</body></html>`,
      { waitUntil: "networkidle" },
    );
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(args.out, `${name}.png`);
    await page.screenshot({ path: file });
    console.log(`  ${file}`);
  }
} finally {
  await chromiumBrowser.close();
}
