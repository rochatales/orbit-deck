import { Group, Mesh, MeshStandardMaterial, PlaneGeometry } from "three";
import { TroikaLabel3D } from "./troikaLabel";

export class InteractionLabel3D extends Group {
  private readonly background: Mesh;
  private readonly label: TroikaLabel3D;
  private readonly keyChip: Mesh;
  private visibleTarget = false;

  constructor() {
    super();

    this.background = new Mesh(
      new PlaneGeometry(1.24, 0.26),
      new MeshStandardMaterial({
        color: "#0f1824",
        transparent: true,
        opacity: 0.42,
        roughness: 0.22,
        metalness: 0.04
      })
    );
    this.background.position.z = -0.002;
    this.add(this.background);

    this.keyChip = new Mesh(
      new PlaneGeometry(0.18, 0.14),
      new MeshStandardMaterial({
        color: "#f6efe2",
        transparent: true,
        opacity: 0.9
      })
    );
    this.keyChip.position.set(-0.42, 0, 0.002);
    this.add(this.keyChip);

    const keyLabel = new TroikaLabel3D({
      text: "E",
      fontSize: 0.072,
      color: "#192433",
      anchorY: "middle",
      outlineOpacity: 0
    });
    keyLabel.position.set(-0.42, 0, 0.01);
    this.add(keyLabel);

    this.label = new TroikaLabel3D({
      text: "INTERAGIR",
      fontSize: 0.062,
      maxWidth: 0.92,
      anchorX: "center",
      anchorY: "middle"
    });
    this.label.position.set(0.16, 0, 0.01);
    this.add(this.label);

    this.visible = false;
  }

  show(text: string) {
    this.visibleTarget = true;
    this.label.setText(text.toUpperCase());
    this.visible = true;
  }

  hide() {
    this.visibleTarget = false;
    this.visible = false;
  }

  isVisibleTarget() {
    return this.visibleTarget;
  }
}
