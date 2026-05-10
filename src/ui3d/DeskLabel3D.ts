import { Group, Mesh, MeshStandardMaterial, PlaneGeometry } from "three";
import { TroikaLabel3D } from "./troikaLabel";

export class DeskLabel3D extends Group {
  private readonly background: Mesh;
  private readonly accentBar: Mesh;
  private readonly title: TroikaLabel3D;
  private readonly zone: TroikaLabel3D;

  constructor(title: string, zone: string, accentColor: string) {
    super();

    this.background = new Mesh(
      new PlaneGeometry(1.18, 0.3),
      new MeshStandardMaterial({
        color: "#f4eee4",
        transparent: true,
        opacity: 0.8,
        roughness: 0.3,
        metalness: 0.02
      })
    );
    this.background.position.z = -0.002;
    this.add(this.background);

    this.accentBar = new Mesh(
      new PlaneGeometry(0.72, 0.02),
      new MeshStandardMaterial({
        color: accentColor,
        transparent: true,
        opacity: 0.78
      })
    );
    this.accentBar.position.set(0, -0.095, 0.003);
    this.add(this.accentBar);

    this.title = new TroikaLabel3D({
      text: title.toUpperCase(),
      fontSize: 0.06,
      color: "#1c2837",
      maxWidth: 1.0,
      anchorY: "middle",
      outlineOpacity: 0
    });
    this.title.position.set(0, 0.04, 0.01);
    this.add(this.title);

    this.zone = new TroikaLabel3D({
      text: zone.toUpperCase(),
      fontSize: 0.04,
      color: "#425266",
      maxWidth: 0.94,
      anchorY: "middle",
      outlineOpacity: 0
    });
    this.zone.position.set(0, -0.048, 0.01);
    this.add(this.zone);
  }

  setHighlighted(highlighted: boolean) {
    (this.background.material as MeshStandardMaterial).opacity = highlighted ? 0.92 : 0.8;
    this.scale.setScalar(highlighted ? 1.04 : 1);
  }
}
