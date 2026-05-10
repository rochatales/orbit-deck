import { Color, Group, Mesh, MeshStandardMaterial, PlaneGeometry } from "three";
import { TroikaLabel3D } from "./troikaLabel";

type ButtonVisualState = "idle" | "nearby" | "active" | "completed";

export class ActionButton3D extends Group {
  private readonly background: Mesh;
  private readonly border: Mesh;
  private readonly label: TroikaLabel3D;
  private readonly accent: Color;

  constructor(label: string, accentColor: string, width = 0.9) {
    super();
    this.accent = new Color(accentColor);

    this.background = new Mesh(
      new PlaneGeometry(width, 0.16),
      new MeshStandardMaterial({
        color: "#172333",
        transparent: true,
        opacity: 0.32,
        roughness: 0.2,
        metalness: 0.05
      })
    );
    this.add(this.background);

    this.border = new Mesh(
      new PlaneGeometry(width * 0.94, 0.018),
      new MeshStandardMaterial({
        color: accentColor,
        transparent: true,
        opacity: 0.28
      })
    );
    this.border.position.set(0, -0.055, 0.003);
    this.add(this.border);

    this.label = new TroikaLabel3D({
      text: label,
      fontSize: 0.05,
      maxWidth: width * 0.82,
      anchorY: "middle"
    });
    this.label.position.set(0, 0.005, 0.01);
    this.add(this.label);
  }

  setState(state: ButtonVisualState) {
    (this.background.material as MeshStandardMaterial).opacity =
      state === "active" ? 0.68 : state === "nearby" ? 0.48 : state === "completed" ? 0.52 : 0.32;
    (this.border.material as MeshStandardMaterial).opacity = state === "idle" ? 0.28 : state === "nearby" ? 0.65 : 0.92;
    (this.border.material as MeshStandardMaterial).color.copy(state === "completed" ? new Color("#4dd393") : this.accent);
    this.scale.setScalar(state === "active" ? 1.04 : 1);
    this.label.setColor(state === "completed" ? "#4dd393" : "#f8fbff");
  }
}
