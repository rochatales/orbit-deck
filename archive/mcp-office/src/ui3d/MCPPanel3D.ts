import { Color, Group, LineBasicMaterial, MeshStandardMaterial, Vector3 } from "three";
import type { MCPConfig } from "../npcs/mcpData";
import { ActionButton3D } from "./ActionButton3D";
import { StatusBadge3D } from "./StatusBadge3D";
import { createGlassPanel } from "./panelMesh";
import { TroikaLabel3D } from "./troikaLabel";
import { getShortActionLabel, getShortRoleLabel } from "./theme";

type PanelState = "idle" | "nearby" | "active" | "complete";

export class MCPPanel3D extends Group {
  readonly npcId: string;

  private readonly badge: StatusBadge3D;
  private readonly title: TroikaLabel3D;
  private readonly role: TroikaLabel3D;
  private readonly buttons: ActionButton3D[];
  private readonly panelFrame;
  private readonly worldPosition = new Vector3();
  private readonly accentColor: string;

  constructor(npc: MCPConfig, buttonLimit = 3) {
    super();
    this.npcId = npc.id;
    this.accentColor = npc.color;
    const buttonLabels = npc.actions.slice(0, buttonLimit).map((action) => getShortActionLabel(action.id));
    const panelHeight = 0.7 + buttonLabels.length * 0.22;

    this.panelFrame = createGlassPanel(1.72, panelHeight, { opacity: 0.36, borderOpacity: 0.28 });
    this.add(this.panelFrame.group);

    this.badge = new StatusBadge3D("OCIOSO", npc.color);
    this.badge.position.set(0, panelHeight / 2 - 0.13, 0.01);
    this.add(this.badge);

    this.title = new TroikaLabel3D({
      text: npc.name.replace(" MCP", "").toUpperCase(),
      fontSize: 0.08,
      maxWidth: 1.4,
      anchorY: "middle"
    });
    this.title.position.set(0, panelHeight / 2 - 0.31, 0.01);
    this.add(this.title);

    this.role = new TroikaLabel3D({
      text: getShortRoleLabel(npc.id),
      fontSize: 0.048,
      color: "#c9d2df",
      maxWidth: 1.3,
      anchorY: "middle",
      outlineOpacity: 0.45
    });
    this.role.position.set(0, panelHeight / 2 - 0.44, 0.01);
    this.add(this.role);

    this.buttons = buttonLabels.map((label, index) => {
      const button = new ActionButton3D(label, npc.color, 1.22);
      button.position.set(0, panelHeight / 2 - 0.67 - index * 0.22, 0.01);
      this.add(button);
      return button;
    });
  }

  setState(state: PanelState) {
    const panelScale = state === "active" ? 1.06 : state === "nearby" ? 1.03 : 1;
    this.scale.setScalar(panelScale);

    (this.panelFrame.panel.material as MeshStandardMaterial).opacity =
      state === "active" ? 0.62 : state === "nearby" ? 0.46 : state === "complete" ? 0.52 : 0.36;
    (this.panelFrame.border.material as LineBasicMaterial).opacity = state === "idle" ? 0.28 : state === "nearby" ? 0.44 : 0.88;
    (this.panelFrame.accentStrip.material as MeshStandardMaterial).opacity = state === "idle" ? 0.18 : 0.56;
    (this.panelFrame.accentStrip.material as MeshStandardMaterial).color.copy(
      state === "complete" ? new Color("#4dd393") : new Color(this.accentColor)
    );

    if (state === "active") {
      this.badge.setLabel("AO VIVO");
      this.badge.setTone("active");
    } else if (state === "nearby") {
      this.badge.setLabel("PRONTO");
      this.badge.setTone("nearby");
    } else if (state === "complete") {
      this.badge.setLabel("FEITO");
      this.badge.setTone("complete");
    } else {
      this.badge.setLabel("OCIOSO");
      this.badge.setTone("idle");
    }

    this.buttons.forEach((button, index) => {
      if (state === "active") {
        button.setState(index === 0 ? "active" : "nearby");
      } else if (state === "nearby") {
        button.setState(index === 0 ? "nearby" : "idle");
      } else if (state === "complete") {
        button.setState("completed");
      } else {
        button.setState("idle");
      }
    });
  }

  faceCamera(cameraPosition: Vector3) {
    this.getWorldPosition(this.worldPosition);
    this.lookAt(cameraPosition.x, this.worldPosition.y, cameraPosition.z);
  }
}
