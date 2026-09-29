import type { PixelTextureState } from "./usePixelTexture";

interface TextureLoadBannerProps {
  /** Map of label → texture state. Label is what we show to the user. */
  textures: Record<string, PixelTextureState>;
}

/**
 * HTML overlay banner that surfaces texture load failures so the user
 * doesn't have to open DevTools to figure out why the scene is empty.
 * Renders inside the scene HUD layer (above the canvas but below the
 * registration panel).
 *
 *  - All ready  → render nothing.
 *  - Some pending → small "Carregando arte..." chip.
 *  - Any error   → red banner listing every failing URL and the most
 *    common fix (restart Vite so it picks up public/ files).
 */
export function TextureLoadBanner({ textures }: TextureLoadBannerProps) {
  const entries = Object.entries(textures);
  const errors = entries.filter(([, state]) => state.status === "error");
  const pending = entries.filter(([, state]) => state.status === "pending");

  if (errors.length === 0 && pending.length === 0) {
    return null;
  }

  if (errors.length > 0) {
    return (
      <div
        role="alert"
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          right: 12,
          padding: "10px 14px",
          background: "rgba(72, 8, 24, 0.92)",
          border: "1px solid #ff5c7a",
          color: "#ffe2ea",
          fontFamily: '"Courier New", monospace',
          fontSize: 12,
          lineHeight: 1.45,
          letterSpacing: "0.04em",
          pointerEvents: "auto",
          zIndex: 5
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 4, color: "#ff8aa7" }}>
          Arte pixel não carregou
        </div>
        <div>
          {errors.map(([label]) => (
            <div key={label}>· {label}</div>
          ))}
        </div>
        <div style={{ marginTop: 6, opacity: 0.78 }}>
          Reinicie o dev server (Ctrl+C → <code>npm run dev</code>). O Vite só
          escaneia <code>public/</code> no boot — arquivos novos não aparecem
          até reiniciar.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        padding: "6px 10px",
        background: "rgba(8, 16, 32, 0.78)",
        border: "1px solid rgba(146, 224, 255, 0.4)",
        color: "#9eefff",
        fontFamily: '"Courier New", monospace',
        fontSize: 11,
        letterSpacing: "0.08em",
        zIndex: 5
      }}
    >
      Carregando arte... ({pending.length})
    </div>
  );
}
