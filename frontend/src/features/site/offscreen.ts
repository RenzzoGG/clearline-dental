/**
 * For sections below the fold: `content-visibility: auto` lets the browser skip their layout
 * and paint until they approach the viewport (the landing is long, and every web-font swap
 * would otherwise re-lay out all of it). `contain-intrinsic-size: auto <h>` reserves an
 * estimated height and then remembers the real one, so the scrollbar stays stable.
 */
export const OFFSCREEN_SECTION = "[content-visibility:auto] [contain-intrinsic-size:auto_900px]";
