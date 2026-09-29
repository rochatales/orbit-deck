import { Group, Mesh, MeshStandardMaterial, PlaneGeometry } from "three";
import { TroikaLabel3D } from "./troikaLabel";

export class FloatingNameplate3D extends Group {
  private readonly title: TroikaLabel3D;
  private readonly zone: TroikaLabel3D;
  private readonly accentBar: Mesh;
  private readonly background: Mesh;

  constructor(name: string, zone: string, accentColor: string) {
    super();

    this.background = new Mesh(
      new PlaneGeometry(1.5, 0.42),
      new MeshStandardMaterial({
        color: "#101723",
        transparent: true,
        opacity: 0.34,
        roughness: 0.25,
        metalness: 0.06
      })
    );
    this.background.position.z = -0.002;
    this.add(this.background);

    this.accentBar = new Mesh(
      new PlaneGeometry(1.15, 0.02),
      new MeshStandardMaterial({
        color: accentColor,
        transparent: true,
        opacity: 0.82
      })
    );
    this.accentBar.position.set(0, -0.16, 0.002);
    this.add(this.accentBar);

    this.title = new TroikaLabel3D({
      text: name.toUpperCase(),
      fontSize: 0.09,
      maxWidth: 1.35,
      anchorY: "middle"
    });
    this.title.position.set(0, 0.065, 0.01);
    this.add(this.title);

    this.zone = new TroikaLabel3D({
      text: zone.toUpperCase(),
      fontSize: 0.048,
      color: "#c9d2df",
      maxWidth: 1.2,
      anchorY: "middle",
      outlineOpacity: 0.48
    });
    this.zone.position.set(0, -0.07, 0.01);
    this.add(this.zone);
  }

  setHighlighted(highlighted: boolean) {
    (this.background.material as MeshStandardMaterial).opacity = highlighted ? 0.5 : 0.34;
    this.scale.setScalar(highlighted ? 1.06 : 1);
  }
}
