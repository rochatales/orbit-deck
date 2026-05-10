import { getWorkflowTaskIdForAction, type NpcAction, type NpcId } from "../domain/mcpActions";
import { Vector3 } from "three";
import { NPCManager } from "../npcs/NPCManager";
import { PlayerController } from "../player/PlayerController";
import { UIManager } from "../ui/UIManager";

export class InteractionManager {
  private readonly playerPosition = new Vector3();
  private nearbyNpcId: string | null = null;
  private dialogNpcId: string | null = null;

  constructor(
    private readonly player: PlayerController,
    private readonly npcManager: NPCManager,
    private readonly ui: UIManager
  ) {
    window.addEventListener("keydown", this.onKeyDown);
    this.ui.setOnRequestClose(() => this.closeDialog());
  }

  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
  }

  update() {
    this.playerPosition.copy(this.player.position);
    const nearbyNpc = this.npcManager.getNearestNPC(this.playerPosition, 2.3);
    this.nearbyNpcId = nearbyNpc?.data.id ?? null;

    if (!this.ui.isDialogOpen() && nearbyNpc) {
      this.ui.setInteractionHint(`Pressione E para interagir com ${nearbyNpc.data.name}`);
      this.ui.setLocation(`MCP Office · ${nearbyNpc.data.zoneName}`);
    } else if (!this.ui.isDialogOpen()) {
      this.ui.setInteractionHint("Caminhe ate uma mesa MCP para inspecionar o fluxo.");
      this.ui.setLocation("MCP Office");
    }

    if (!this.ui.isDialogOpen()) {
      this.player.setEnabled(true);
    }
  }

  getFocusNpcId() {
    return this.dialogNpcId ?? this.nearbyNpcId;
  }

  getDialogNpcId() {
    return this.dialogNpcId;
  }

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.repeat) {
      return;
    }

    if (event.code === "Escape" && this.ui.isDialogOpen()) {
      this.closeDialog();
      return;
    }

    if (event.code === "KeyE" && !this.ui.isDialogOpen()) {
      this.openNearbyDialog();
    }
  };

  private openNearbyDialog() {
    const npc = this.npcManager.findById(this.nearbyNpcId);
    if (!npc) {
      this.ui.showToast("Nenhum MCP por perto");
      return;
    }

    this.dialogNpcId = npc.data.id;
    this.player.setEnabled(false);
    if (npc.data.id === "brand-brain") {
      const progress = this.ui.markTask("talk-brand-brain");
      this.handleRunProgress(progress.justCompletedRun);
    }
    this.ui.setInteractionHint("ESC para fechar o console MCP");
    this.ui.setLocation(`MCP Office · ${npc.data.zoneName}`);
    this.ui.openDialog(npc.data, (action) => {
      this.handleAction(npc.data.name, npc.data.id, action);
    });
  }

  private closeDialog() {
    this.dialogNpcId = null;
    this.player.setEnabled(true);
    this.ui.closeDialog();
  }

  private handleAction(npcName: string, npcId: NpcId, action: NpcAction) {
    // Future integration hook:
    // Replace this log-only branch with real MCP command dispatchers or API adapters.
    const message = `${npcName}: ${action.label} acionado - acao placeholder.`;
    this.npcManager.triggerAction(npcId);
    this.ui.addLog(message);
    this.ui.showToast(action.label);
    this.ui.setWorkflowStatus("Sistema Editorial para Instagram · Ativo");

    const taskId = getWorkflowTaskIdForAction(npcId, action.id);
    if (taskId) {
      const progress = this.ui.markTask(taskId);
      this.handleRunProgress(progress.justCompletedRun);
    }
  }

  private handleRunProgress(justCompletedRun: boolean) {
    if (!justCompletedRun) {
      return;
    }

    this.npcManager.markCompleted("output-review");
    this.ui.setWorkflowStatus("Sistema Editorial para Instagram · Concluido");
    this.ui.addLog("Execucao concluida: First Contact esta pronto para entrega.");
    this.ui.showToast("Primeira execucao concluida");
  }
}
