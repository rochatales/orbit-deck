import { Group, Scene, Vector3 } from "three";
import type { MCPConfig } from "../npcs/mcpData";
import type { TaskSnapshot } from "../ui/UIManager";
import { getRoomByNpcId, WORKFLOW_SCREEN_POSITION } from "../world/mapConfig";
import { DeskLabel3D } from "./DeskLabel3D";
import { FloatingNameplate3D } from "./FloatingNameplate3D";
import { InteractionLabel3D } from "./InteractionLabel3D";
import { MCPPanel3D } from "./MCPPanel3D";
import { WorkflowScreen3D } from "./WorkflowScreen3D";

interface PanelEntry {
  id: string;
  panel: MCPPanel3D;
  label: DeskLabel3D;
  npcNameplate: FloatingNameplate3D;
  npcPosition: Vector3;
}

export class UI3DManager {
  private readonly group = new Group();
  private readonly panels: PanelEntry[];
  private readonly workflowScreen: WorkflowScreen3D;
  private readonly interactionLabel: InteractionLabel3D;

  constructor(npcs: MCPConfig[]) {
    this.panels = npcs.map((npc) => {
      const panel = new MCPPanel3D(npc);
      const label = new DeskLabel3D(npc.name, npc.zoneName, npc.color);
      const npcNameplate = new FloatingNameplate3D(npc.name, npc.zoneName, npc.color);
      const room = getRoomByNpcId(npc.id);

      if (room) {
        panel.position.copy(room.anchors.panel);
        label.position.copy(room.anchors.deskLabel);
        npcNameplate.position.copy(room.anchors.npcNameplate);
      }

      this.group.add(panel, label, npcNameplate);

      return { id: npc.id, panel, label, npcNameplate, npcPosition: new Vector3(npc.position.x, 2.6, npc.position.z) };
    });

    this.workflowScreen = new WorkflowScreen3D();
    this.workflowScreen.position.copy(WORKFLOW_SCREEN_POSITION);
    this.interactionLabel = new InteractionLabel3D();
    this.group.add(this.workflowScreen, this.interactionLabel);
  }

  addToScene(scene: Scene) {
    scene.add(this.group);
  }

  update(cameraPosition: Vector3, focusNpcId: string | null, dialogNpcId: string | null, location: string, workflowStatus: string, tasks: TaskSnapshot[], runCompleted: boolean) {
    let interactionAnchor: Vector3 | undefined;

    this.panels.forEach(({ id, panel, label, npcNameplate, npcPosition }) => {
      const state =
        runCompleted && id === "output-review"
          ? "complete"
          : dialogNpcId === id
            ? "active"
            : focusNpcId === id
              ? "nearby"
              : "idle";

      panel.setState(state);
      label.setHighlighted(focusNpcId === id || dialogNpcId === id);
      npcNameplate.setHighlighted(focusNpcId === id || dialogNpcId === id);
      panel.faceCamera(cameraPosition);
      label.lookAt(cameraPosition.x, label.position.y, cameraPosition.z);
      npcNameplate.lookAt(cameraPosition.x, npcNameplate.position.y, cameraPosition.z);

      if (dialogNpcId === id) {
        interactionAnchor = npcPosition.clone().add(new Vector3(0, 0.38, 0));
      } else if (!dialogNpcId && focusNpcId === id) {
        interactionAnchor = npcPosition.clone();
      }
    });

    this.workflowScreen.updateState(location, workflowStatus, tasks, runCompleted);
    this.workflowScreen.faceCamera(cameraPosition);

    if (interactionAnchor) {
      this.interactionLabel.position.copy(interactionAnchor);
      const anchorY = interactionAnchor.y;
      this.interactionLabel.lookAt(cameraPosition.x, anchorY, cameraPosition.z);
      this.interactionLabel.show(dialogNpcId ? "AO VIVO" : "INTERAGIR");
    } else {
      this.interactionLabel.hide();
    }
  }
}
