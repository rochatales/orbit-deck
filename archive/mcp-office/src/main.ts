import "./ui/styles.css";
import { Clock } from "three";
import { createScene } from "./scene/createScene";
import { CameraController, createCamera } from "./scene/camera";
import { createOfficeMap } from "./world/createOfficeMap";
import { PLAYER_SPAWN } from "./world/mapConfig";
import { PlayerController } from "./player/PlayerController";
import { NPCManager } from "./npcs/NPCManager";
import { UIManager } from "./ui/UIManager";
import { InteractionManager } from "./interactions/InteractionManager";
import { UI3DManager } from "./ui3d/UI3DManager";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root was not found.");
}

const { scene, renderer } = createScene(app);
const camera = createCamera(app.clientWidth / app.clientHeight);
const cameraController = new CameraController(camera);

const npcManager = new NPCManager();
const office = createOfficeMap(npcManager.getNpcData());
scene.add(office.group);
npcManager.addToScene(scene);

const player = new PlayerController(PLAYER_SPAWN);
scene.add(player.object);

const ui = new UIManager(app);
ui.bootstrapTasks();
ui.addLog("MCP Office iniciado. Visite cada mesa para inspecionar o fluxo.");
ui.addLog("Use WASD ou as setas para andar. Pressione E perto de um MCP para abrir o console.");

const interactions = new InteractionManager(player, npcManager, ui);
const ui3d = new UI3DManager(npcManager.getNpcData());
ui3d.addToScene(scene);

window.addEventListener("keydown", (event) => {
  player.onKeyChange(event.code, true);
  cameraController.onKeyChange(event.code, true);
});

window.addEventListener("keyup", (event) => {
  player.onKeyChange(event.code, false);
  cameraController.onKeyChange(event.code, false);
});

app.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    cameraController.onWheel(event.deltaY);
  },
  { passive: false }
);

window.addEventListener("resize", () => {
  const aspect = app.clientWidth / app.clientHeight;
  cameraController.resize(aspect);
  renderer.setSize(app.clientWidth, app.clientHeight);
});

const clock = new Clock();

function animate() {
  const delta = Math.min(clock.getDelta(), 1 / 30);

  office.update(player.object.position, delta);
  player.update(delta, office, camera);
  interactions.update();
  npcManager.update(
    delta,
    player.object.position,
    interactions.getFocusNpcId(),
    ui.isDialogOpen() ? interactions.getFocusNpcId() : null
  );
  cameraController.update(player.object.position, delta);
  scene.updateMatrixWorld();
  ui3d.update(
    camera.position,
    interactions.getFocusNpcId(),
    interactions.getDialogNpcId(),
    ui.getCurrentLocation(),
    ui.getCurrentWorkflowStatus(),
    ui.getTasks(),
    ui.isRunCompleted()
  );

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

window.addEventListener("beforeunload", () => {
  interactions.dispose();
  renderer.dispose();
});
