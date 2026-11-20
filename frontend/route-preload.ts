import type { Plugin, Rollup } from "vite";

type OutputChunk = Rollup.OutputChunk;

/**
 * Build-only Vite plugin: preload the JS of the route being opened, in parallel with the app
 * shell.
 *
 * Every page is a lazy route. Without help the browser downloads index.js, runs it, and
 * only then discovers the page chunk (a waterfall that delayed LCP on slow phones).
 * This plugin maps each URL to the chunks its page needs (minus what the shell already
 * loads) and injects a tiny inline script that adds <link rel="modulepreload"> for the
 * current URL near the top of <head>.
 *
 * `routes` maps a pathname to the page's source module (path relative to the project).
 */
export function routePreload(routes: Record<string, string>): Plugin {
  let base = "/";
  return {
    name: "clearline-route-preload",
    apply: "build",
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        const bundle = ctx.bundle as Rollup.OutputBundle;
        const chunks = Object.values(bundle).filter((c): c is OutputChunk => c.type === "chunk");
        const byFile = new Map(chunks.map((c) => [c.fileName, c]));

        const closure = (chunk: OutputChunk, seen = new Set<string>()) => {
          if (seen.has(chunk.fileName)) return seen;
          seen.add(chunk.fileName);
          for (const file of chunk.imports) {
            const imported = byFile.get(file);
            if (imported) closure(imported, seen);
          }
          return seen;
        };

        const entry = chunks.find((c) => c.isEntry);
        if (!entry) throw new Error("route-preload: no entry chunk");
        const shell = closure(entry);

        const preloads: Record<string, string[]> = {};
        for (const [pathname, source] of Object.entries(routes)) {
          const page = chunks.find((c) => c.facadeModuleId?.endsWith(source));
          if (!page) throw new Error(`route-preload: no chunk for ${source}`);
          preloads[pathname] = [...closure(page)]
            .filter((file) => !shell.has(file))
            .map((file) => base + file);
        }

        // crossOrigin "" matches the crossorigin attribute Vite puts on its module scripts,
        // otherwise the browser would not reuse the preloaded response.
        const script =
          `(function(){var m=${JSON.stringify(preloads)};` +
          `var p=location.pathname.replace(/\\/+$/,"")||"/";` +
          `(m[p]||[]).forEach(function(h){var l=document.createElement("link");` +
          `l.rel="modulepreload";l.crossOrigin="";l.href=h;document.head.appendChild(l)})})()`;
        // Right after <meta charset>: as early as possible, but the charset declaration must
        // stay within the first 1024 bytes of the document.
        const charset = /<meta charset="[^"]*"\s*\/?>/i;
        if (!charset.test(html)) throw new Error("route-preload: <meta charset> not found");
        return html.replace(charset, (tag) => `${tag}\n    <script>${script}</script>`);
      },
    },
  };
}
