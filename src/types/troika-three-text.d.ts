declare module "troika-three-text" {
  import { Material, Mesh } from "three";

  export class Text extends Mesh {
    text: string;
    font?: string;
    fontSize: number;
    color: string | number;
    anchorX?: number | string;
    anchorY?: number | string;
    maxWidth?: number;
    lineHeight?: number | string;
    letterSpacing?: number;
    fillOpacity?: number;
    outlineWidth?: number | string;
    outlineColor?: string | number;
    outlineOpacity?: number;
    depthOffset?: number;
    curveRadius?: number;
    whiteSpace?: string;
    material: Material;
    sync(callback?: () => void): void;
    dispose(): void;
  }
}
