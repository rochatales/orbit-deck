import { Color, Group, Mesh, MeshStandardMaterial, PlaneGeometry } from "three";
import { TroikaLabel3D } from "./troikaLabel";

type BadgeTone = "idle" | "nearby" | "active" | "complete";

export class StatusBadge3D extends Group {
  private readonly background: Mesh;
  private readonly bar: Mesh;
  private readonly text: TroikaLabel3D;
  private readonly accent: Color;

  constructor(label: string, accentColor: string) {
    super();
    this.accent = new Color(accentColor);

    this.background = new Mesh(
      new PlaneGeometry(0.56, 0.14),
      new MeshStandardMaterial({
        color: "#101723",
        transparent: true,
        opacity: 0.28
      })
    );
    this.add(this.background);

    this.bar = new Mesh(
      new PlaneGeometry(0.48, 0.016),
      new MeshStandardMaterial({
        color: accentColor,
        transparent: true,
        opacity: 0.72
      })
    );
    this.bar.position.set(0, -0.045, 0.002);
    this.add(this.bar);

    this.text = new TroikaLabel3D({
      text: label.toUpperCase(),
      fontSize: 0.045,
      maxWidth: 0.48,
      anchorY: "middle",
      outlineOpacity: 0.45
    });
    this.text.position.set(0, 0.005, 0.01);
    this.add(this.text);
  }

  setLabel(label: string) {
    this.text.setText(label.toUpperCase());
  }

  setTone(tone: BadgeTone) {
    const color = tone === "complete" ? new Color("#4dd393") : tone === "idle" ? new Color("#90a3bf") : this.accent;
    (this.bar.material as MeshStandardMaterial).color.copy(color);
    (this.bar.material as MeshStandardMaterial).opacity = tone === "idle" ? 0.4 : 0.9;
    (this.background.material as MeshStandardMaterial).opacity =
      tone === "active" ? 0.46 : tone === "nearby" ? 0.36 : tone === "complete" ? 0.42 : 0.24;
    this.text.setColor(tone === "complete" ? "#4dd393" : "#f8fbff");
  }
}
