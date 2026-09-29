import { DirectionalLight, Group, HemisphereLight, PointLight } from "three";

export function createLights() {
  const group = new Group();

  const hemisphere = new HemisphereLight(0xfff5df, 0xc1b39d, 1.25);
  group.add(hemisphere);

  const sun = new DirectionalLight(0xffffff, 1.8);
  sun.position.set(8, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 40;
  sun.shadow.camera.left = -15;
  sun.shadow.camera.right = 15;
  sun.shadow.camera.top = 15;
  sun.shadow.camera.bottom = -15;
  sun.shadow.bias = -0.0003;
  group.add(sun);

  const fill = new PointLight(0xfff0cc, 18, 26, 2);
  fill.position.set(0, 6.5, 0);
  group.add(fill);

  return group;
}
