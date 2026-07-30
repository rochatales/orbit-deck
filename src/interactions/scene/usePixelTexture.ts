import { useEffect, useRef, useState } from "react";
import {
  ClampToEdgeWrapping,
  NearestFilter,
  SRGBColorSpace,
  Texture,
  TextureLoader
} from "three";

const sharedTextureLoader = new TextureLoader();
const cache = new Map<string, Texture>();

function configure(texture: Texture): Texture {
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export type PixelTextureStatus = "pending" | "ready" | "error";

export interface PixelTextureState {
  texture: Texture | null;
  status: PixelTextureStatus;
  error?: string;
}

/**
 * Crash-safe pixel-art texture loader.
 *
 *  - Returns `{ texture, status }`. While the image is loading,
 *    `texture` is null and `status` is "pending". On success, `status`
 *    flips to "ready" and the texture is fully configured for pixel-art
 *    sampling (NearestFilter, no mipmaps, sRGB).
 *  - On failure (404, CORS, decode error) we log to the console and
 *    set status to "error" — the component stays mounted, the host
 *    scene can render a fallback color instead of unmounting the tree.
 *  - Textures are cached by URL so multiple meshes that share an
 *    asset share GPU memory.
 *
 * Unlike drei's `useTexture`, this hook does not suspend — so a missing
 * PNG cannot bubble through an unhandled rejection and blank the
 * screen.
 */
export function usePixelTexture(url: string): PixelTextureState {
  const [state, setState] = useState<PixelTextureState>(() => {
    const cached = cache.get(url);
    return cached
      ? { texture: cached, status: "ready" as PixelTextureStatus }
      : { texture: null, status: "pending" as PixelTextureStatus };
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const cached = cache.get(url);
    if (cached) {
      setState({ texture: cached, status: "ready" });
      return;
    }
    setState({ texture: null, status: "pending" });

    sharedTextureLoader.load(
      url,
      (texture) => {
        configure(texture);
        cache.set(url, texture);
        if (mountedRef.current) {
          setState({ texture, status: "ready" });
        }
      },
      undefined,
      (err) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[usePixelTexture] failed to load ${url}`, err);
        if (mountedRef.current) {
          setState({ texture: null, status: "error", error: message });
        }
      }
    );
  }, [url]);

  return state;
}
