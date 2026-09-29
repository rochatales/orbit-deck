import { Object3D, OrthographicCamera, Vector3 } from "three";
import type { NpcAction } from "../domain/mcpActions";
import type { MCPConfig } from "../npcs/mcpData";

export interface TaskSnapshot {
  id: string;
  label: string;
  completed: boolean;
}

interface NpcLabel {
  id: string;
  name: string;
  zoneName: string;
  color: string;
  anchor: Object3D;
}

export class UIManager {
  private readonly overlay: HTMLDivElement;
  private readonly locationValue: HTMLSpanElement;
  private readonly workflowValue: HTMLSpanElement;
  private readonly hint: HTMLDivElement;
  private readonly logList: HTMLDivElement;
  private readonly dialogBackdrop: HTMLDivElement;
  private readonly dialogName: HTMLHeadingElement;
  private readonly dialogRole: HTMLParagraphElement;
  private readonly dialogText: HTMLParagraphElement;
  private readonly dialogActions: HTMLDivElement;
  private readonly taskList: HTMLUListElement;
  private readonly labelsLayer: HTMLDivElement;
  private readonly statusToast: HTMLDivElement;
  private readonly labelMap = new Map<string, HTMLDivElement>();
  private tasks: TaskSnapshot[] = [];
  private dialogOpen = false;
  private readonly vector = new Vector3();
  private toastTimer?: number;
  private onRequestClose?: () => void;
  private currentLocation = "MCP Office";
  private currentWorkflowStatus = "Sistema Editorial para Instagram";
  private runCompleted = false;

  constructor(root: HTMLElement) {
    this.overlay = document.createElement("div");
    this.overlay.className = "ui-root";

    this.overlay.innerHTML = `
      <div class="hud-bar hud-bar-left">
        <span class="hud-label">Espaco</span>
        <span class="hud-value" data-role="location">MCP Office</span>
      </div>
      <div class="hud-bar hud-bar-right">
        <span class="hud-label">Fluxo</span>
        <span class="hud-value" data-role="workflow">Sistema Editorial para Instagram</span>
      </div>
      <section class="task-panel">
        <div class="panel-title">Execucao Atual</div>
        <ul class="task-list"></ul>
      </section>
      <section class="log-panel">
        <div class="panel-title">Log de Status</div>
        <div class="log-list"></div>
      </section>
      <section class="controls-panel">
        <div class="panel-title">Camera</div>
        <div class="controls-item">Zoom: roda do mouse ou <strong>+</strong> / <strong>-</strong></div>
        <div class="controls-item">Rotacao: <strong>Q</strong> / <strong>R</strong></div>
      </section>
      <div class="interaction-hint hidden"></div>
      <div class="status-toast">Prototipo online</div>
      <div class="npc-label-layer"></div>
      <div class="dialog-backdrop hidden">
        <div class="dialog-panel">
          <button class="dialog-close" type="button" aria-label="Fechar">ESC</button>
          <div class="dialog-kicker">No MCP</div>
          <h2 class="dialog-name"></h2>
          <p class="dialog-role"></p>
          <p class="dialog-text"></p>
          <div class="dialog-actions"></div>
        </div>
      </div>
    `;

    root.appendChild(this.overlay);

    this.locationValue = this.overlay.querySelector('[data-role="location"]') as HTMLSpanElement;
    this.workflowValue = this.overlay.querySelector('[data-role="workflow"]') as HTMLSpanElement;
    this.hint = this.overlay.querySelector(".interaction-hint") as HTMLDivElement;
    this.logList = this.overlay.querySelector(".log-list") as HTMLDivElement;
    this.dialogBackdrop = this.overlay.querySelector(".dialog-backdrop") as HTMLDivElement;
    this.dialogName = this.overlay.querySelector(".dialog-name") as HTMLHeadingElement;
    this.dialogRole = this.overlay.querySelector(".dialog-role") as HTMLParagraphElement;
    this.dialogText = this.overlay.querySelector(".dialog-text") as HTMLParagraphElement;
    this.dialogActions = this.overlay.querySelector(".dialog-actions") as HTMLDivElement;
    this.taskList = this.overlay.querySelector(".task-list") as HTMLUListElement;
    this.labelsLayer = this.overlay.querySelector(".npc-label-layer") as HTMLDivElement;
    this.statusToast = this.overlay.querySelector(".status-toast") as HTMLDivElement;

    const closeButton = this.overlay.querySelector(".dialog-close") as HTMLButtonElement;
    closeButton.addEventListener("click", () => {
      if (this.onRequestClose) {
        this.onRequestClose();
      } else {
        this.closeDialog();
      }
    });
  }

  bootstrapTasks() {
    this.runCompleted = false;
    this.tasks = [
      { id: "talk-brand-brain", label: "Falar com o Brand Brain MCP", completed: false },
      { id: "generate-brief", label: "Gerar briefing editorial", completed: false },
      { id: "send-to-design", label: "Enviar para o MCP de Design", completed: false },
      { id: "review-output", label: "Revisar na estacao de saida", completed: false }
    ];
    this.renderTasks();
  }

  bindNpcLabels(labels: NpcLabel[]) {
    labels.forEach((label) => {
      const element = document.createElement("div");
      element.className = "npc-label";
      element.innerHTML = `
        <span class="npc-label-name">${label.name}</span>
        <span class="npc-label-zone">${label.zoneName}</span>
      `;
      element.style.setProperty("--accent", label.color);
      this.labelsLayer.appendChild(element);
      this.labelMap.set(label.id, element);
    });
  }

  updateNpcLabels(labels: NpcLabel[], camera: OrthographicCamera, width: number, height: number, focusNpcId: string | null) {
    labels.forEach((label) => {
      const element = this.labelMap.get(label.id);
      if (!element) {
        return;
      }

      this.vector.setFromMatrixPosition(label.anchor.matrixWorld);
      this.vector.project(camera);

      const visible =
        this.vector.x >= -1 &&
        this.vector.x <= 1 &&
        this.vector.y >= -1 &&
        this.vector.y <= 1 &&
        this.vector.z >= -1 &&
        this.vector.z <= 1;
      element.classList.toggle("hidden", !visible);
      element.classList.toggle("focused", label.id === focusNpcId);

      const x = (this.vector.x * 0.5 + 0.5) * width;
      const y = (this.vector.y * -0.5 + 0.5) * height;
      element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    });
  }

  setLocation(location: string) {
    this.currentLocation = location;
    this.locationValue.textContent = location;
  }

  setWorkflowStatus(status: string) {
    this.currentWorkflowStatus = status;
    this.workflowValue.textContent = status;
  }

  setInteractionHint(text: string | null) {
    if (!text) {
      this.hint.classList.add("hidden");
      return;
    }
    this.hint.textContent = text;
    this.hint.classList.remove("hidden");
  }

  showToast(message: string) {
    this.statusToast.textContent = message;
    this.statusToast.classList.add("visible");
    if (this.toastTimer) {
      window.clearTimeout(this.toastTimer);
    }
    this.toastTimer = window.setTimeout(() => {
      this.statusToast.classList.remove("visible");
    }, 1800);
  }

  setOnRequestClose(handler: () => void) {
    this.onRequestClose = handler;
  }

  addLog(message: string) {
    const item = document.createElement("div");
    item.className = "log-item";
    item.textContent = message;
    this.logList.prepend(item);

    while (this.logList.children.length > 6) {
      this.logList.removeChild(this.logList.lastElementChild as ChildNode);
    }
  }

  markTask(id: string) {
    const task = this.tasks.find((entry) => entry.id === id);
    if (!task || task.completed) {
      return {
        taskCompleted: false,
        runCompleted: this.runCompleted,
        justCompletedRun: false,
        completedCount: this.tasks.filter((entry) => entry.completed).length,
        total: this.tasks.length
      };
    }

    task.completed = true;
    const completedCount = this.tasks.filter((entry) => entry.completed).length;
    const runCompleted = completedCount === this.tasks.length && this.tasks.length > 0;
    const justCompletedRun = !this.runCompleted && runCompleted;
    this.runCompleted = this.runCompleted || runCompleted;
    this.renderTasks();

    return {
      taskCompleted: true,
      runCompleted: this.runCompleted,
      justCompletedRun,
      completedCount,
      total: this.tasks.length
    };
  }

  openDialog(npc: MCPConfig, onAction: (action: NpcAction) => void) {
    this.dialogOpen = true;
    this.dialogName.textContent = npc.name;
    this.dialogRole.textContent = npc.role;
    this.dialogText.textContent = npc.dialogue;
    this.dialogActions.innerHTML = "";

    npc.actions.forEach((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dialog-action";
      button.textContent = action.label;
      button.addEventListener("click", () => onAction(action));
      this.dialogActions.appendChild(button);
    });

    this.dialogBackdrop.classList.remove("hidden");
  }

  closeDialog() {
    this.dialogOpen = false;
    this.dialogBackdrop.classList.add("hidden");
  }

  isDialogOpen() {
    return this.dialogOpen;
  }

  isRunCompleted() {
    return this.runCompleted;
  }

  getCurrentLocation() {
    return this.currentLocation;
  }

  getCurrentWorkflowStatus() {
    return this.currentWorkflowStatus;
  }

  getTasks() {
    return this.tasks.map((task) => ({ ...task }));
  }

  private renderTasks() {
    this.taskList.innerHTML = "";
    this.tasks.forEach((task) => {
      const item = document.createElement("li");
      item.className = `task-item${task.completed ? " completed" : ""}`;
      item.textContent = task.label;
      this.taskList.appendChild(item);
    });
  }
}
