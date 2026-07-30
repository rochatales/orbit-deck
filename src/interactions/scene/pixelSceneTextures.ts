import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearFilter,
  NearestFilter,
  SRGBColorSpace,
  Texture,
  TextureLoader
} from "three";

/**
 * Master pixel unit (world units per art pixel).
 *
 * 1 art pixel = `PX` world units. Every sprite plane, every position and
 * every size in an interaction scene must be a multiple of `PX`. See
 * docs/PIXEL_INTERACTION_VISUAL_ROADMAP.md for the locked rules.
 */
export const PX = 4;

/**
 * Logical resolution of a pixel-art interaction stage, expressed in art
 * pixels. Stage world size = STAGE_PX.{width,height} * PX = 960x540.
 */
export const STAGE_PX = {
  width: 240,
  height: 135
} as const;

/**
 * Round a world-unit value to the nearest `PX` multiple. Use defensively
 * whenever a position or size comes from a calculation that might not land
 * on the grid (talk-cycle offsets, dynamic layouts, etc.). Literal numerics
 * in scenes should already be PX-aligned by hand.
 */
export function snap(value: number): number {
  return Math.round(value / PX) * PX;
}

export type PixelBubbleTail = "left" | "right" | "none";

export interface PixelDialogueTextureOptions {
  speaker: string;
  lines: string[];
  tail?: PixelBubbleTail;
  accentColor?: string;
}

export type PixelPortraitMood = "idle" | "talk";

export function configurePixelTexture(texture: Texture) {
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

const sharedTextureLoader = new TextureLoader();
const pixelTextureCache = new Map<string, Texture>();

/**
 * Load a PNG (or any TextureLoader-supported image) and configure it for
 * crisp pixel-art rendering: NearestFilter, no mipmaps, sRGB color space,
 * clamped wrapping. Cached by URL so multiple sprites pointing at the same
 * file share a single GPU texture.
 *
 * Use this for real art assets dropped under public/art/. For procedural
 * canvas textures keep using createCanvasTexture.
 */
export function loadPixelTexture(url: string): Texture {
  const cached = pixelTextureCache.get(url);
  if (cached) return cached;
  const texture = sharedTextureLoader.load(url);
  configurePixelTexture(texture);
  pixelTextureCache.set(url, texture);
  return texture;
}

export function createCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return configurePixelTexture(new CanvasTexture(canvas));
  }

  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  return configurePixelTexture(new CanvasTexture(canvas));
}

function rect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
}

function polygon(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  color: string
) {
  if (points.length === 0) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) {
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

export function createGlowTexture(inner: string, outer: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return configurePixelTexture(new CanvasTexture(canvas));
  }

  const gradient = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.55, outer);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

export function createBrandBrainBackgroundTexture() {
  // Phase A migration: canvas is now 240x135 art pixels.
  // Plane stays 960x540 world units -> exact 4x upscale, fully on the PX grid.
  // Every coord below = half of the prior 480x270 draw, rounded to integers.
  return createCanvasTexture(STAGE_PX.width, STAGE_PX.height, (ctx) => {
    rect(ctx, 0, 0, 240, 135, "#070b19");
    rect(ctx, 0, 0, 240, 41, "#0b1228");
    rect(ctx, 0, 41, 240, 94, "#0a0f22");

    polygon(ctx, [[35, 56], [124, 27], [215, 58], [125, 109]], "#151d3d");
    polygon(ctx, [[43, 58], [124, 35], [204, 61], [125, 101]], "#1d294f");
    polygon(ctx, [[124, 35], [204, 61], [204, 41], [124, 17]], "#111a38");
    polygon(ctx, [[43, 58], [124, 35], [124, 17], [43, 39]], "#0f1732");

    for (let i = 0; i < 13; i += 1) {
      const x = 49 + i * 12;
      polygon(
        ctx,
        [[x, 59], [x + 10, 56], [x + 19, 60], [x + 9, 64]],
        "rgba(104, 146, 188, 0.18)"
      );
    }

    rect(ctx, 144, 41, 45, 27, "#15264a");
    rect(ctx, 151, 48, 31, 12, "#203e63");
    rect(ctx, 153, 50, 13, 2, "#35e7ff");
    rect(ctx, 153, 54, 24, 2, "#35e7ff");
    rect(ctx, 168, 50, 9, 9, "#d66bff");
    rect(ctx, 193, 40, 27, 9, "#0e1a31");
    rect(ctx, 197, 43, 18, 2, "#35e7ff");

    rect(ctx, 52, 35, 29, 20, "#101933");
    rect(ctx, 57, 40, 19, 9, "#214361");
    rect(ctx, 59, 42, 13, 2, "#8eefff");
    rect(ctx, 59, 46, 9, 2, "#d66bff");

    rect(ctx, 105, 48, 18, 6, "#0b101f");
    rect(ctx, 111, 54, 6, 26, "#101933");
    rect(ctx, 95, 80, 38, 5, "#0b101f");

    rect(ctx, 0, 0, 240, 135, "rgba(2, 5, 16, 0.22)");
    rect(ctx, 0, 0, 240, 17, "rgba(2, 5, 16, 0.32)");
    rect(ctx, 0, 118, 240, 17, "rgba(2, 5, 16, 0.42)");
  });
}

export function createEdenPlaceholderTexture(mood: PixelPortraitMood = "idle") {
  return createCanvasTexture(164, 224, (ctx) => {
    rect(ctx, 0, 0, 164, 224, "rgba(0,0,0,0)");

    rect(ctx, 32, 18, 104, 12, "#070915");
    rect(ctx, 20, 30, 128, 20, "#070915");
    rect(ctx, 12, 50, 140, 54, "#070915");
    rect(ctx, 24, 104, 116, 24, "#070915");

    rect(ctx, 36, 18, 96, 16, "#f7a8a2");
    rect(ctx, 24, 34, 116, 24, "#e78f9e");
    rect(ctx, 16, 54, 132, 48, "#cb748f");
    rect(ctx, 30, 102, 104, 22, "#ac5f83");
    rect(ctx, 48, 28, 26, 18, "#ffc1a9");
    rect(ctx, 84, 24, 32, 22, "#ffb3a3");
    rect(ctx, 36, 66, 44, 18, "#9d4f79");
    rect(ctx, 96, 62, 36, 22, "#ffd5b9");
    rect(ctx, 128, 48, 8, 52, "#9efcff");
    rect(ctx, 22, 58, 8, 46, "#65eaff");

    rect(ctx, 42, 100, 82, 34, "#f5a488");
    rect(ctx, 38, 118, 36, 28, "#f5b292");
    rect(ctx, 88, 118, 36, 28, "#f5b292");

    rect(ctx, 30, 118, 48, 38, "#10172a");
    rect(ctx, 84, 118, 48, 38, "#10172a");
    rect(ctx, 36, 124, 34, 24, "#c8fcff");
    rect(ctx, 90, 124, 34, 24, "#c8fcff");
    rect(ctx, 48, 128, 12, mood === "talk" ? 16 : 12, "#45667e");
    rect(ctx, 104, 128, 12, mood === "talk" ? 16 : 12, "#45667e");
    rect(ctx, 56, 126, 4, 4, "#eaffff");
    rect(ctx, 112, 126, 4, 4, "#eaffff");
    rect(ctx, 78, 132, 8, 8, "#10172a");
    rect(ctx, 74, 148, mood === "talk" ? 22 : 14, mood === "talk" ? 8 : 4, "#5f244b");

    rect(ctx, 62, 156, 38, 16, "#eafaff");
    rect(ctx, 46, 172, 72, 48, "#d7f3ff");
    rect(ctx, 34, 178, 18, 34, "#b7d8e8");
    rect(ctx, 118, 178, 14, 34, "#b7d8e8");
    rect(ctx, 70, 172, 16, 42, "#11172b");
    rect(ctx, 86, 172, 16, 42, "#4b2948");
    rect(ctx, 54, 216, 62, 8, "#070915");
  });
}

export function createPlayerPlaceholderTexture(mood: PixelPortraitMood = "idle") {
  return createCanvasTexture(112, 174, (ctx) => {
    rect(ctx, 0, 0, 112, 174, "rgba(0,0,0,0)");

    rect(ctx, 24, 18, 64, 12, "#07101c");
    rect(ctx, 16, 30, 80, 64, "#07101c");
    rect(ctx, 24, 22, 64, 14, "#d5f2ee");
    rect(ctx, 18, 36, 76, 54, "#b4d7d5");
    rect(ctx, 26, 44, 60, 38, "#07172a");
    rect(ctx, 32, 50, 18, 16, "#22f0e0");
    rect(ctx, 62, 52, mood === "talk" ? 18 : 10, 12, "#20d8de");
    rect(ctx, 18, 64, 8, 28, "#29f6ee");
    rect(ctx, 88, 56, 8, 32, "#d86bff");

    rect(ctx, 34, 94, 44, 58, "#f0977f");
    rect(ctx, 26, 104, 16, 42, "#d77b70");
    rect(ctx, 78, 104, 14, 42, "#d77b70");
    rect(ctx, 42, 108, 28, 20, "#10233a");
    rect(ctx, 46, 112, 12, 12, "#44efff");
    rect(ctx, 58, 132, 10, 22, "#10172a");
    rect(ctx, 32, 152, 20, 12, "#d5f2ee");
    rect(ctx, 68, 152, 20, 12, "#d5f2ee");
  });
}

/**
 * Phase B speech bubble.
 *
 * Canvas: 240 x 72 art pixels. Plane in scene: 480 x 144 (2x upscale on
 * the PX grid). Chosen over the original 120x40 spec because Press Start
 * 2P bottoms out at 8px and 120 px wide canvas only fits ~14 chars/line;
 * 240 fits ~28 which matches the existing getDialogueLines wrap.
 *
 * Frame anatomy:
 *   - 2 px white outer border (ice white #dff6ff)
 *   - 1 art-pixel notched corners (fake-rounded pixel-art look)
 *   - Dark navy fill (#0b1224) with a 1 px highlight line at the top
 *     of the inner area for that "screen-lit" feel
 *   - Tail: 4-step pixel triangle dropping out of the bottom edge on
 *     the side the speaker is on
 *   - Speaker label top-left in accent color, body lines below in white
 *     using Press Start 2P at 8 px
 */
const BUBBLE_CANVAS_WIDTH = 240;
const BUBBLE_CANVAS_FRAME_HEIGHT = 64;
const BUBBLE_TAIL_HEIGHT = 8;
const BUBBLE_CANVAS_HEIGHT = BUBBLE_CANVAS_FRAME_HEIGHT + BUBBLE_TAIL_HEIGHT;
const BUBBLE_BORDER = "#dff6ff";
const BUBBLE_FILL = "#0b1224";
const BUBBLE_HIGHLIGHT = "rgba(128, 237, 255, 0.55)";
const BUBBLE_BODY_TEXT = "#edf8ff";
const BUBBLE_DEFAULT_ACCENT = "#9eefff";

function drawBubbleFrame(ctx: CanvasRenderingContext2D, tail: PixelBubbleTail) {
  const w = BUBBLE_CANVAS_WIDTH;
  const frameH = BUBBLE_CANVAS_FRAME_HEIGHT;

  // Outer border (top, bottom, left, right) drawn 2 px thick, leaving a
  // 1 px gap from the canvas edge for the notched corner illusion.
  rect(ctx, 2, 0, w - 4, 2, BUBBLE_BORDER); // top
  rect(ctx, 2, frameH - 2, w - 4, 2, BUBBLE_BORDER); // bottom
  rect(ctx, 0, 2, 2, frameH - 4, BUBBLE_BORDER); // left
  rect(ctx, w - 2, 2, 2, frameH - 4, BUBBLE_BORDER); // right

  // 1 px chamfer pixels at each corner.
  rect(ctx, 2, 2, 1, 1, BUBBLE_BORDER);
  rect(ctx, w - 3, 2, 1, 1, BUBBLE_BORDER);
  rect(ctx, 2, frameH - 3, 1, 1, BUBBLE_BORDER);
  rect(ctx, w - 3, frameH - 3, 1, 1, BUBBLE_BORDER);

  // Inner fill.
  rect(ctx, 2, 2, w - 4, frameH - 4, BUBBLE_FILL);

  // 1 px highlight line just inside the top border.
  rect(ctx, 3, 3, w - 6, 1, BUBBLE_HIGHLIGHT);

  // Tail: 4 pixel-art steps pointing down on the speaker's side.
  // Drawn so the tip projects 4 px below the bottom border, mirroring
  // the reference frame's bubble notch.
  if (tail !== "none") {
    const baseX = tail === "left" ? 26 : w - 26 - 12; // 12 px wide tail
    const baseY = frameH - 2;
    // Step pattern (px): row 0 = full 12-wide white, then we carve dark.
    // We build it bottom-up so the inner fill stays clean.
    rect(ctx, baseX, baseY, 12, 1, BUBBLE_BORDER);
    rect(ctx, baseX + 1, baseY + 1, 10, 1, BUBBLE_BORDER);
    rect(ctx, baseX + 2, baseY + 2, 8, 1, BUBBLE_BORDER);
    rect(ctx, baseX + 3, baseY + 3, 6, 1, BUBBLE_BORDER);
    // Carve the dark fill into the tail so it looks like one bubble.
    rect(ctx, baseX + 1, baseY, 10, 1, BUBBLE_FILL);
    rect(ctx, baseX + 2, baseY + 1, 8, 1, BUBBLE_FILL);
    rect(ctx, baseX + 3, baseY + 2, 6, 1, BUBBLE_FILL);
    rect(ctx, baseX + 4, baseY + 3, 4, 1, BUBBLE_FILL);
  }
}

export function createSpeechBubbleTexture({
  speaker,
  lines,
  tail = "none",
  accentColor = BUBBLE_DEFAULT_ACCENT
}: PixelDialogueTextureOptions) {
  return createCanvasTexture(BUBBLE_CANVAS_WIDTH, BUBBLE_CANVAS_HEIGHT, (ctx) => {
    rect(ctx, 0, 0, BUBBLE_CANVAS_WIDTH, BUBBLE_CANVAS_HEIGHT, "rgba(0,0,0,0)");
    drawBubbleFrame(ctx, tail);

    // Text. Press Start 2P glyphs sit on an 8x8 grid; we use 8 px and
    // give the speaker label a little more vertical room than the body.
    ctx.textBaseline = "top";

    ctx.fillStyle = accentColor;
    ctx.font = `8px "Press Start 2P", "Courier New", monospace`;
    ctx.fillText(speaker.toUpperCase(), 10, 8);

    ctx.fillStyle = BUBBLE_BODY_TEXT;
    ctx.font = `8px "Press Start 2P", "Courier New", monospace`;
    lines.slice(0, 2).forEach((line, index) => {
      ctx.fillText(line, 10, 24 + index * 14);
    });
  });
}

export function createBadgeTexture(label: string) {
  return createCanvasTexture(128, 40, (ctx) => {
    rect(ctx, 4, 4, 120, 32, "rgba(11, 16, 32, 0.88)");
    ctx.strokeStyle = "#d9ecff";
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 116, 28);
    ctx.fillStyle = "#d9ecff";
    ctx.font = "bold 16px monospace";
    ctx.fillText(label, 34, 25);
  });
}
