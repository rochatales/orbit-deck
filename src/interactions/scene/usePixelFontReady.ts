import { useEffect, useState } from "react";

/**
 * Canonical CSS font shorthand for the pixel UI bubble.
 *
 * Always include a final monospace fallback in case Press Start 2P fails
 * to load (offline, blocked CDN). The canvas will then draw with the
 * system monospace at the same nominal size, which is ugly but readable.
 */
export const PIXEL_FONT_FAMILY = `"Press Start 2P", "Courier New", monospace`;

/**
 * Compose a pixel-font shorthand at the given px size.
 *
 * Press Start 2P only looks good at integer multiples of its 8px base
 * grid (8, 16, 24...). For body copy at small sizes we still use 8; the
 * canvas upscale handles the chunky look.
 */
export function pixelFont(sizePx: number): string {
  return `${sizePx}px ${PIXEL_FONT_FAMILY}`;
}

/**
 * Resolves when Press Start 2P (at the small sizes we use for canvas
 * text) is actually loaded and usable. Used by canvas texture authors
 * to redraw once the real glyphs arrive instead of caching a first
 * paint with the monospace fallback.
 *
 * Returns true immediately in SSR / test environments so callers don't
 * deadlock.
 */
export async function waitForPixelFontReady(): Promise<boolean> {
  if (typeof document === "undefined" || !document.fonts || !document.fonts.load) {
    return true;
  }
  try {
    await Promise.all([
      document.fonts.load(`8px "Press Start 2P"`),
      document.fonts.load(`10px "Press Start 2P"`),
      document.fonts.load(`12px "Press Start 2P"`)
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * React hook companion. Starts false on first render, flips true once
 * the pixel font is available. Trigger texture rebuilds by depending on
 * its return value.
 */
export function usePixelFontReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    waitForPixelFontReady().then((ok) => {
      if (!cancelled) setReady(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return ready;
}
