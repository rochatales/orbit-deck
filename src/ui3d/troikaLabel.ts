import { Color, Group, MeshBasicMaterial } from "three";
import { Text } from "troika-three-text";

const FONT_URL =
  "https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/Manrope%5Bwght%5D.ttf";

export interface TroikaLabelOptions {
  text: string;
  fontSize: number;
  color?: string;
  maxWidth?: number;
  anchorX?: "left" | "center" | "right" | string;
  anchorY?: "top" | "middle" | "bottom" | "top-cap" | "bottom-baseline" | string;
  outlineWidth?: number;
  outlineColor?: string;
  outlineOpacity?: number;
  letterSpacing?: number;
}

export class TroikaLabel3D extends Group {
  readonly textMesh: Text;

  constructor(options: TroikaLabelOptions) {
    super();

    this.textMesh = new Text();
    this.textMesh.text = options.text;
    this.textMesh.font = FONT_URL;
    this.textMesh.fontSize = options.fontSize;
    this.textMesh.color = options.color ?? "#f8fbff";
    this.textMesh.anchorX = options.anchorX ?? "center";
    this.textMesh.anchorY = options.anchorY ?? "middle";
    this.textMesh.maxWidth = options.maxWidth;
    this.textMesh.letterSpacing = options.letterSpacing ?? 0.004;
    this.textMesh.fillOpacity = 1;
    this.textMesh.outlineWidth = options.outlineWidth ?? 0.01;
    this.textMesh.outlineColor = options.outlineColor ?? "#0d1420";
    this.textMesh.outlineOpacity = options.outlineOpacity ?? 0.65;
    this.textMesh.depthOffset = -1;
    this.textMesh.material = new MeshBasicMaterial({ color: new Color(options.color ?? "#f8fbff") });
    this.textMesh.sync();

    this.add(this.textMesh);
  }

  setText(text: string) {
    if (this.textMesh.text === text) {
      return;
    }
    this.textMesh.text = text;
    this.textMesh.sync();
  }

  setColor(color: string) {
    this.textMesh.color = color;
    this.textMesh.sync();
  }

  dispose() {
    this.textMesh.dispose();
  }
}
