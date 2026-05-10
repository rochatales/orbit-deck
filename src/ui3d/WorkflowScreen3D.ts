import { Group, LineBasicMaterial, MeshStandardMaterial, Vector3 } from "three";
import type { TaskSnapshot } from "../ui/UIManager";
import { ActionButton3D } from "./ActionButton3D";
import { StatusBadge3D } from "./StatusBadge3D";
import { createGlassPanel } from "./panelMesh";
import { TroikaLabel3D } from "./troikaLabel";
import { getShortTaskLabel } from "./theme";

export class WorkflowScreen3D extends Group {
  private readonly badge: StatusBadge3D;
  private readonly title: TroikaLabel3D;
  private readonly locationText: TroikaLabel3D;
  private readonly statusText: TroikaLabel3D;
  private readonly steps: Array<{ id: string; button: ActionButton3D }>;
  private readonly panelFrame;
  private readonly worldPosition = new Vector3();

  constructor() {
    super();

    this.panelFrame = createGlassPanel(2.5, 1.52, { opacity: 0.4, borderOpacity: 0.28 });
    this.add(this.panelFrame.group);

    this.badge = new StatusBadge3D("ATIVO", "#d8e4ff");
    this.badge.position.set(0, 0.63, 0.01);
    this.add(this.badge);

    this.title = new TroikaLabel3D({
      text: "TELA DE FLUXO",
      fontSize: 0.086,
      maxWidth: 2.0
    });
    this.title.position.set(0, 0.43, 0.01);
    this.add(this.title);

    this.locationText = new TroikaLabel3D({
      text: "MCP OFFICE",
      fontSize: 0.058,
      color: "#c9d2df",
      maxWidth: 2.1,
      outlineOpacity: 0.45
    });
    this.locationText.position.set(0, 0.26, 0.01);
    this.add(this.locationText);

    this.statusText = new TroikaLabel3D({
      text: "SISTEMA EDITORIAL INSTAGRAM",
      fontSize: 0.046,
      color: "#c9d2df",
      maxWidth: 2.16,
      outlineOpacity: 0.45
    });
    this.statusText.position.set(0, 0.14, 0.01);
    this.add(this.statusText);

    const stepIds = ["talk-brand-brain", "generate-brief", "send-to-design", "review-output"];
    this.steps = stepIds.map((stepId, index) => {
      const button = new ActionButton3D(getShortTaskLabel(stepId), "#9fbff8", 1.72);
      button.position.set(0, -0.12 - index * 0.22, 0.01);
      this.add(button);
      return { id: stepId, button };
    });
  }

  updateState(location: string, workflowStatus: string, tasks: TaskSnapshot[], runCompleted: boolean) {
    this.locationText.setText(location.toUpperCase());
    this.statusText.setText(workflowStatus.toUpperCase());

    if (runCompleted) {
      this.badge.setLabel("CONCLUIDO");
      this.badge.setTone("complete");
      (this.panelFrame.panel.material as MeshStandardMaterial).opacity = 0.52;
      (this.panelFrame.accentStrip.material as MeshStandardMaterial).color.set("#4dd393");
      (this.panelFrame.accentStrip.material as MeshStandardMaterial).opacity = 0.72;
      (this.panelFrame.border.material as LineBasicMaterial).opacity = 0.88;
    } else {
      this.badge.setLabel("ATIVO");
      this.badge.setTone("nearby");
      (this.panelFrame.panel.material as MeshStandardMaterial).opacity = 0.4;
      (this.panelFrame.accentStrip.material as MeshStandardMaterial).color.set("#eef6ff");
      (this.panelFrame.accentStrip.material as MeshStandardMaterial).opacity = 0.22;
      (this.panelFrame.border.material as LineBasicMaterial).opacity = 0.28;
    }

    this.steps.forEach((step) => {
      const matchingTask = tasks.find((task) => task.id === step.id);
      step.button.setState(matchingTask?.completed ? "completed" : "idle");
    });
  }

  faceCamera(cameraPosition: Vector3) {
    this.getWorldPosition(this.worldPosition);
    this.lookAt(cameraPosition.x, this.worldPosition.y, cameraPosition.z);
  }
}
