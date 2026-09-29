import { ACESFilmicToneMapping, Color, Fog, Scene, SRGBColorSpace, WebGLRenderer } from "three";
import { createLights } from "./lights";

export function createScene(container: HTMLElement) {
  const scene = new Scene();
  scene.background = new Color("#f6efe2");
  scene.fog = new Fog("#f6efe2", 18, 34);

  const renderer = new WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.domElement.className = "game-canvas";
  container.appendChild(renderer.domElement);

  scene.add(createLights());

  return { scene, renderer };
}
