import { create } from "zustand";
import type { ClientProfile } from "../domain/clientProfiles";
import { generateEditorialBrief } from "../domain/editorialBrief";
import { getWorkflowTaskIdForAction, type ActionId, type NpcAction, type NpcId } from "../domain/mcpActions";
import { MCP_NPCS } from "../npcs/mcpData";
import { useClientSetupStore, type MissionStage } from "./useClientSetupStore";

export type WorkflowTaskStatus = "idle" | "active" | "completed";
export type WorkflowNotificationPhase = "pending" | "running" | "complete" | "error";

export interface WorkflowTask {
  id: string;
  label: string;
  status: WorkflowTaskStatus;
}

export interface WorkflowNotification {
  id: string;
  npcId: NpcId | "system";
  npcName: string;
  actionId: ActionId | null;
  accentColor: string;
  phase: WorkflowNotificationPhase;
  title: string;
  message: string;
}

interface WorkflowState {
  location: string;
  workflowStatus: string;
  interactionHint: string;
  tasks: WorkflowTask[];
  logEntries: string[];
  notifications: WorkflowNotification[];
  runCompleted: boolean;
  activeActionKeys: string[];
  npcPulseVersion: Record<string, number>;
  bootstrap: () => void;
  setLocation: (location: string) => void;
  setWorkflowStatus: (status: string) => void;
  setInteractionHint: (hint: string) => void;
  addLog: (message: string) => void;
  pushSystemNotification: (title: string, message: string, phase?: WorkflowNotificationPhase) => void;
  dismissNotification: (id: string) => void;
  setTaskStatus: (id: string, status: WorkflowTaskStatus) => { justCompletedRun: boolean };
  completeTask: (id: string) => { justCompletedRun: boolean };
  triggerNpcPulse: (npcId: string) => void;
  isActionInFlight: (npcId: NpcId, actionId: ActionId, clientSlug?: string | null) => boolean;
  handleNpcAction: (npcName: string, npcId: NpcId, action: NpcAction, client: ClientProfile) => Promise<void>;
}

const SYSTEM_NOTIFICATION_ACCENT = "#8aa7c7";
const PENDING_DELAY_MS = 200;
const COMPLETE_DISMISS_DELAY_MS = 2400;
const ERROR_DISMISS_DELAY_MS = 3200;
const initialNpcPulseVersion = Object.fromEntries(MCP_NPCS.map((npc) => [npc.id, 0])) as Record<string, number>;
let notificationSequence = 0;
const DEFAULT_LOCATION = "Sala Principal";
const WORKFLOW_NAME = "Sistema Editorial para Instagram";

const notificationTimers = new Map<string, number>();

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

const initialTasks = (): WorkflowTask[] => [
  { id: "talk-brand-brain", label: "Falar com o Brand Brain MCP", status: "idle" },
  { id: "generate-brief", label: "Gerar briefing editorial", status: "idle" },
  { id: "send-to-design", label: "Enviar para o MCP de Design", status: "idle" },
  { id: "review-output", label: "Revisar na estação de saída", status: "idle" }
];

function createNotificationId(prefix: string) {
  notificationSequence += 1;
  return `${prefix}-${notificationSequence}`;
}

function clearNotificationTimer(id: string) {
  const timer = notificationTimers.get(id);
  if (timer) {
    window.clearTimeout(timer);
    notificationTimers.delete(id);
  }
}

function getActionDurationMs(actionId: ActionId) {
  const seed = actionId
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);
  return 1500 + (seed % 1500);
}

function getClientScopedActionKey(npcId: NpcId, actionId: ActionId, clientSlug?: string | null) {
  return `${npcId}:${actionId}:${clientSlug ?? "no-client"}`;
}

/**
 * Mapeia (NPC, ação) para o avanço de etapa da missão criativa do cliente.
 *
 *  - editorial / generate-editorial-brief → `designing` (gera o briefing
 *    localmente antes de avançar; tratado fora desta tabela).
 *  - editorial / send-brief-to-design     → `reviewing`
 *  - design   / assemble-carousel-layout  → `reviewing`
 *  - design   / prepare-image-prompt      → `reviewing`
 *  - output-review / export-package        → `published`
 *  - output-review / mark-ready-to-publish → `published`
 *
 * Qualquer outra combinação retorna `null` — não move a missão.
 */
function getMissionEffectForAction(npcId: NpcId, actionId: ActionId): MissionStage | null {
  if (npcId === "editorial" && actionId === "send-brief-to-design") return "reviewing";
  if (npcId === "design" && actionId === "assemble-carousel-layout") return "reviewing";
  if (npcId === "design" && actionId === "prepare-image-prompt") return "reviewing";
  if (npcId === "output-review" && actionId === "export-package") return "published";
  if (npcId === "output-review" && actionId === "mark-ready-to-publish") return "published";
  return null;
}

/**
 * Aplica os efeitos de missão associados à conclusão de uma ação:
 *  1. Para "Gerar Briefing Editorial", gera o briefing local a partir do
 *     `CustomClientRecord` e chama `recordBriefForClient` (que também
 *     avança a missão para `designing`).
 *  2. Para as ações mapeadas em `getMissionEffectForAction`, chama
 *     `setMissionStage` na etapa alvo.
 */
function applyMissionEffects(npcId: NpcId, actionId: ActionId, clientSlug: string) {
  const clientStore = useClientSetupStore.getState();
  const record = clientStore.customClients.find((c) => c.slug === clientSlug);
  if (!record) return;

  if (npcId === "editorial" && actionId === "generate-editorial-brief") {
    const brief = generateEditorialBrief({
      clientSlug: record.slug,
      clientDisplayName: record.displayName,
      answers: record.answers
    });
    clientStore.recordBriefForClient(record.slug, brief);
    return;
  }

  const target = getMissionEffectForAction(npcId, actionId);
  if (!target) return;
  clientStore.setMissionStage(record.slug, target);
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  location: DEFAULT_LOCATION,
  workflowStatus: WORKFLOW_NAME,
  interactionHint: "Caminhe até uma mesa MCP para inspecionar o fluxo.",
  tasks: initialTasks(),
  logEntries: [],
  notifications: [],
  runCompleted: false,
  activeActionKeys: [],
  npcPulseVersion: initialNpcPulseVersion,
  bootstrap: () => {
    notificationTimers.forEach((timer) => window.clearTimeout(timer));
    notificationTimers.clear();

    set({
      location: DEFAULT_LOCATION,
      workflowStatus: WORKFLOW_NAME,
      interactionHint: "Caminhe até uma mesa MCP para inspecionar o fluxo.",
      tasks: initialTasks(),
      logEntries: [
        `${DEFAULT_LOCATION} iniciada. Visite cada mesa para inspecionar o fluxo.`,
        "Use WASD ou as setas para andar. Pressione E perto de um MCP para abrir o console."
      ],
      notifications: [],
      runCompleted: false,
      activeActionKeys: [],
      npcPulseVersion: { ...initialNpcPulseVersion }
    });
  },
  setLocation: (location) => set({ location }),
  setWorkflowStatus: (status) => set({ workflowStatus: status }),
  setInteractionHint: (hint) => set({ interactionHint: hint }),
  addLog: (message) =>
    set((state) => ({
      logEntries: [message, ...state.logEntries].slice(0, 6)
    })),
  pushSystemNotification: (title, message, phase = "complete") => {
    const id = createNotificationId("system");
    const notification: WorkflowNotification = {
      id,
      npcId: "system",
      npcName: DEFAULT_LOCATION,
      actionId: null,
      accentColor: SYSTEM_NOTIFICATION_ACCENT,
      phase,
      title,
      message
    };

    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 5)
    }));

    clearNotificationTimer(id);
    notificationTimers.set(
      id,
      window.setTimeout(() => {
        get().dismissNotification(id);
      }, phase === "error" ? ERROR_DISMISS_DELAY_MS : COMPLETE_DISMISS_DELAY_MS)
    );
  },
  dismissNotification: (id) => {
    clearNotificationTimer(id);
    set((state) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id)
    }));
  },
  setTaskStatus: (id, status) => {
    let justCompletedRun = false;
    set((state) => {
      const tasks = state.tasks.map((task) => (task.id === id ? { ...task, status } : task));
      const runCompleted = tasks.every((task) => task.status === "completed");
      justCompletedRun = !state.runCompleted && runCompleted;

      return {
        tasks,
        runCompleted: state.runCompleted || runCompleted
      };
    });
    return { justCompletedRun };
  },
  completeTask: (id) => get().setTaskStatus(id, "completed"),
  triggerNpcPulse: (npcId) =>
    set((state) => ({
      npcPulseVersion: {
        ...state.npcPulseVersion,
        [npcId]: (state.npcPulseVersion[npcId] ?? 0) + 1
      }
    })),
  isActionInFlight: (npcId, actionId, clientSlug) =>
    get().activeActionKeys.includes(getClientScopedActionKey(npcId, actionId, clientSlug)),
  handleNpcAction: async (npcName, npcId, action, client) => {
    const actionKey = getClientScopedActionKey(npcId, action.id, client.slug);
    if (get().isActionInFlight(npcId, action.id, client.slug)) {
      return;
    }

    const taskId = getWorkflowTaskIdForAction(npcId, action.id);
    const accentColor = MCP_NPCS.find((npc) => npc.id === npcId)?.color ?? SYSTEM_NOTIFICATION_ACCENT;
    const notificationId = createNotificationId("action");
    const queuedNotification: WorkflowNotification = {
      id: notificationId,
      npcId,
      npcName,
      actionId: action.id,
      accentColor,
      phase: "pending",
      title: action.label,
      message: `${npcName} recebeu a solicitação para ${client.displayName} e vai iniciar em instantes.`
    };

    set((state) => ({
      activeActionKeys: [...state.activeActionKeys, actionKey],
      notifications: [queuedNotification, ...state.notifications].slice(0, 5)
    }));

    get().addLog(`${client.displayName} · ${npcName}: ${action.label} entrou na fila.`);
    get().setWorkflowStatus(`${WORKFLOW_NAME} · ${client.displayName} · Processando`);

    if (taskId) {
      get().setTaskStatus(taskId, "active");
    }

    try {
      await delay(PENDING_DELAY_MS);

      set((state) => ({
        notifications: state.notifications.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                phase: "running",
                message: `${npcName} está processando esta etapa de ${client.displayName} agora.`
              }
            : notification
        )
      }));

      get().addLog(`${client.displayName} · ${npcName}: ${action.label} em execução.`);
      await delay(getActionDurationMs(action.id));

      const progress = taskId ? get().completeTask(taskId) : { justCompletedRun: false };

      // Avança a missão criativa do cliente quando a ação concluída
      // bate com um dos checkpoints do pipeline editorial. Também é aqui
      // que o briefing real é gerado a partir do rules.md do cliente.
      applyMissionEffects(npcId, action.id, client.slug);

      set((state) => ({
        activeActionKeys: state.activeActionKeys.filter((key) => key !== actionKey),
        notifications: state.notifications.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                phase: "complete",
                message: `${npcName} concluiu a etapa de ${client.displayName} com sucesso.`
              }
            : notification
        )
      }));

      get().triggerNpcPulse(npcId);
      get().addLog(`${client.displayName} · ${npcName}: ${action.label} concluído.`);

      clearNotificationTimer(notificationId);
      notificationTimers.set(
        notificationId,
        window.setTimeout(() => {
          get().dismissNotification(notificationId);
        }, COMPLETE_DISMISS_DELAY_MS)
      );

      if (progress.justCompletedRun) {
        get().setWorkflowStatus(`${WORKFLOW_NAME} · ${client.displayName} · Concluído`);
        get().addLog(`Execução concluída para ${client.displayName}: pipeline pronto para entrega.`);
        get().pushSystemNotification(
          "Pipeline concluído",
          `Todas as etapas principais de ${client.displayName} foram finalizadas com sucesso.`,
          "complete"
        );
      } else {
        get().setWorkflowStatus(`${WORKFLOW_NAME} · ${client.displayName} · Ativo`);
      }
    } catch {
      if (taskId) {
        get().setTaskStatus(taskId, "idle");
      }

      set((state) => ({
        activeActionKeys: state.activeActionKeys.filter((key) => key !== actionKey),
        notifications: state.notifications.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                phase: "error",
                message: `${npcName} encontrou um erro ao processar a etapa de ${client.displayName}.`
              }
            : notification
        )
      }));

      get().setWorkflowStatus(`${WORKFLOW_NAME} · ${client.displayName} · Ativo`);
      get().addLog(`${client.displayName} · ${npcName}: erro ao processar ${action.label}.`);

      clearNotificationTimer(notificationId);
      notificationTimers.set(
        notificationId,
        window.setTimeout(() => {
          get().dismissNotification(notificationId);
        }, ERROR_DISMISS_DELAY_MS)
      );
    }
  }
}));
