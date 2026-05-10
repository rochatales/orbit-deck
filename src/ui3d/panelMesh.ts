import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Vector3
} from "three";

export function createGlassPanel(width: number, height: number, options?: { opacity?: number; borderOpacity?: number }) {
  const group = new Group();

  const panel = new Mesh(
    new PlaneGeometry(width, height),
    new MeshStandardMaterial({
      color: "#101723",
      transparent: true,
      opacity: options?.opacity ?? 0.4,
      roughness: 0.3,
      metalness: 0.08,
      emissive: "#111a27",
      emissiveIntensity: 0.18,
      side: DoubleSide
    })
  );
  panel.receiveShadow = false;
  panel.castShadow = false;
  group.add(panel);

  const accentStrip = new Mesh(
    new PlaneGeometry(width * 0.92, 0.022),
    new MeshStandardMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.18,
      roughness: 0.2,
      metalness: 0.1,
      side: DoubleSide
    })
  );
  accentStrip.position.set(0, height / 2 - 0.045, 0.003);
  group.add(accentStrip);

  const border = new Line(
    createRectangleOutline(width, height),
    new LineBasicMaterial({
      color: "#eef6ff",
      transparent: true,
      opacity: options?.borderOpacity ?? 0.26
    })
  );
  border.position.z = 0.004;
  group.add(border);

  return { group, panel, border, accentStrip };
}

function createRectangleOutline(width: number, height: number) {
  const geometry = new BufferGeometry();
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const points = [
    new Vector3(-halfWidth, halfHeight, 0),
    new Vector3(halfWidth, halfHeight, 0),
    new Vector3(halfWidth, -halfHeight, 0),
    new Vector3(-halfWidth, -halfHeight, 0),
    new Vector3(-halfWidth, halfHeight, 0)
  ];
  geometry.setAttribute("position", new Float32BufferAttribute(points.flatMap((point) => [point.x, point.y, point.z]), 3));
  return geometry;
}
