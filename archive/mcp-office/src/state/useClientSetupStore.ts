import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ClientSetupAnswers } from "../domain/clientSetupTemplate";
import type { ClientCapabilities, ClientProfile } from "../domain/clientProfiles";
import type { GeneratedBrief } from "../domain/editorialBrief";
import type { NpcId } from "../domain/mcpActions";

/**
 * Etapas da missão criativa por cliente. A missão começa quando o player
 * ativa o Editorial MCP daquele cliente — momento em que o jogo "começa de
 * verdade" — e avança a cada ação completada nos NPCs correspondentes.
 *
 *  idle      → Editorial ainda não ativado para este cliente.
 *  briefing  → Editorial ativado. Próximo passo: gerar briefing com o Mister.
 *  designing → Briefing gerado. Próximo passo: passar para o Max (Design).
 *  reviewing → Design pronto. Próximo passo: aprovação com a Astra (Output Review).
 *  published → Pacote exportado pela Astra. Missão concluída.
 */
export type MissionStage =
  | "idle"
  | "briefing"
  | "designing"
  | "reviewing"
  | "published";

export interface MissionState {
  stage: MissionStage;
  startedAt: number | null;
  briefGeneratedAt: number | null;
  sentToDesignAt: number | null;
  reviewedAt: number | null;
  publishedAt: number | null;
}

export type SmartLabMessageRole = "user" | "assistant";

export interface SmartLabMessage {
  id: string;
  role: SmartLabMessageRole;
  content: string;
  createdAt: number;
}

export interface SmartLabSession {
  messages: SmartLabMessage[];
  lastUpdatedAt: number | null;
}

export const MISSION_ORDER: MissionStage[] = [
  "briefing",
  "designing",
  "reviewing",
  "published"
];

export function defaultMissionState(): MissionState {
  return {
    stage: "idle",
    startedAt: null,
    briefGeneratedAt: null,
    sentToDesignAt: null,
    reviewedAt: null,
    publishedAt: null
  };
}

export function defaultSmartLabSession(): SmartLabSession {
  return {
    messages: [],
    lastUpdatedAt: null
  };
}

function upgradeClientAnswers(answers: ClientSetupAnswers): ClientSetupAnswers {
  return {
    ...answers,
    monthlyEditorialVolume:
      typeof answers.monthlyEditorialVolume === "number" && answers.monthlyEditorialVolume >= 1
        ? answers.monthlyEditorialVolume
        : 12,
    postTypes:
      Array.isArray(answers.postTypes) && answers.postTypes.length > 0
        ? answers.postTypes
        : ["static", "carousel"]
  };
}

/** Compara duas etapas pela ordem do pipeline. */
export function missionStageIndex(stage: MissionStage): number {
  if (stage === "idle") return -1;
  return MISSION_ORDER.indexOf(stage);
}

/**
 * Estado de ativação dos MCPs para um cliente específico.
 *
 * Cada chave reflete o NPC responsável pelo deck:
 * - brandBrain  → EDEN
 * - editorial   → MISTER
 * - design      → MAX
 * - narration   → NARA
 * - socialMedia → ASTRA (NPC `output-review`)
 *
 * `brandBrain` é ativado automaticamente ao concluir o wizard. Os demais
 * só ficam disponíveis depois que o player conversa com cada NPC e
 * confirma a ativação ali — é o que materializa a etapa
 * "ativar MCP por cliente" descrita no plano da MVP.
 */
export interface McpActivationFlags {
  brandBrain: boolean;
  editorial: boolean;
  design: boolean;
  narration: boolean;
  socialMedia: boolean;
}

export function defaultMcpActivation(): McpActivationFlags {
  return {
    brandBrain: true,
    editorial: false,
    design: false,
    narration: false,
    socialMedia: false
  };
}

/**
 * Cliente cadastrado pelo player via conversa com Eden (Brand Brain).
 * Persiste no localStorage para sobreviver a reloads.
 */
export interface CustomClientRecord {
  id: string;
  slug: string;
  displayName: string;
  answers: ClientSetupAnswers;
  rulesMd: string;
  createdAt: number;
  mcpActivation: McpActivationFlags;
  mission: MissionState;
  /**
   * Último briefing editorial gerado pelo Mister para este cliente.
   * `null` enquanto o player não rodar "Gerar Briefing Editorial".
   */
  latestBrief: GeneratedBrief | null;
  smartLab: SmartLabSession;
}

interface ClientSetupState {
  customClients: CustomClientRecord[];
  isWizardOpen: boolean;
  openWizard: () => void;
  closeWizard: () => void;
  addClient: (record: Omit<CustomClientRecord, "mcpActivation" | "mission" | "latestBrief" | "smartLab"> & {
    smartLab?: SmartLabSession;
    mcpActivation?: McpActivationFlags;
    mission?: MissionState;
    latestBrief?: GeneratedBrief | null;
  }) => void;
  removeClient: (id: string) => void;
  /**
   * Liga o MCP do `npcId` para o cliente cadastrado.
   * Idempotente — chamar duas vezes não muda nada.
   */
  activateMcpForClient: (clientId: string, npcId: NpcId) => void;
  /**
   * Liga o MCP do `npcId` para um cliente identificado por slug.
   * Atalho usado pelo DialogueModal que opera por slug.
   *
   * Quando o NPC ativado é o Editorial e a missão está em `idle`,
   * a missão avança automaticamente para `briefing` — é o momento em
   * que o jogo "começa de verdade".
   */
  activateMcpForClientBySlug: (clientSlug: string, npcId: NpcId) => void;
  /**
   * Avança a etapa da missão do cliente. A etapa só é atualizada se
   * `stage` for posterior à etapa atual — evita regressões acidentais.
   * Carimba o timestamp correspondente automaticamente.
   */
  setMissionStage: (clientSlug: string, stage: MissionStage) => void;
  /** Grava o briefing gerado e avança a missão para `designing`. */
  recordBriefForClient: (clientSlug: string, brief: GeneratedBrief) => void;
  /**
   * Persiste uma nova versão do rules.md após uma sessão com o Smart Lab
   * e adiciona as mensagens da conversa ao histórico do cliente.
   */
  appendSmartLabMessages: (
    clientSlug: string,
    messages: SmartLabMessage[],
    nextRulesMd?: string
  ) => void;
}

function applyMissionStage(mission: MissionState, target: MissionStage): MissionState {
  // Não regredimos a etapa — se o player já passou da revisão e clica
  // numa ação que dispararia `designing`, mantemos `reviewing`.
  if (missionStageIndex(target) <= missionStageIndex(mission.stage)) {
    return mission;
  }
  const now = Date.now();
  const next: MissionState = { ...mission, stage: target };
  if (target === "briefing" && next.startedAt === null) next.startedAt = now;
  if (target === "designing" && next.briefGeneratedAt === null) next.briefGeneratedAt = now;
  if (target === "reviewing" && next.sentToDesignAt === null) next.sentToDesignAt = now;
  // `reviewed` é registrado quando o player roda uma ação de Output Review
  // antes de exportar — fica como `reviewedAt` separado do `publishedAt`.
  if (target === "published") {
    if (next.reviewedAt === null) next.reviewedAt = now;
    if (next.publishedAt === null) next.publishedAt = now;
  }
  return next;
}

const PERSIST_KEY = "mcp-office:client-setup:v2";

export const useClientSetupStore = create<ClientSetupState>()(
  persist(
    (set) => ({
      customClients: [],
      isWizardOpen: false,
      openWizard: () => set({ isWizardOpen: true }),
      closeWizard: () => set({ isWizardOpen: false }),
      addClient: (record) =>
        set((state) => {
          const completeRecord: CustomClientRecord = {
            ...record,
            mcpActivation: record.mcpActivation ?? defaultMcpActivation(),
            mission: record.mission ?? defaultMissionState(),
            latestBrief: record.latestBrief ?? null,
            smartLab: record.smartLab ?? defaultSmartLabSession()
          };
          // Garante Brand Brain ativo logo no cadastro — é o que faz o cliente
          // aparecer para os outros NPCs como "elegível para ativação".
          completeRecord.mcpActivation = {
            ...completeRecord.mcpActivation,
            brandBrain: true
          };
          return {
            customClients: [...state.customClients, completeRecord]
          };
        }),
      removeClient: (id) =>
        set((state) => ({
          customClients: state.customClients.filter((c) => c.id !== id)
        })),
      activateMcpForClient: (clientId, npcId) =>
        set((state) => {
          const key = mcpKeyForNpc(npcId);
          if (!key) return state;
          return {
            customClients: state.customClients.map((c) =>
              c.id === clientId
                ? {
                    ...c,
                    mcpActivation: { ...c.mcpActivation, [key]: true }
                  }
                : c
            )
          };
        }),
      activateMcpForClientBySlug: (clientSlug, npcId) =>
        set((state) => {
          const key = mcpKeyForNpc(npcId);
          if (!key) return state;
          return {
            customClients: state.customClients.map((c) => {
              if (c.slug !== clientSlug) return c;
              const nextMcp = { ...c.mcpActivation, [key]: true };
              // Ligar o Editorial é o momento de "início do jogo": se
              // a missão ainda está em `idle`, avança para `briefing`
              // e carimba o `startedAt` no mesmo update.
              const shouldStartMission =
                key === "editorial" && c.mission.stage === "idle";
              return {
                ...c,
                mcpActivation: nextMcp,
                mission: shouldStartMission
                  ? applyMissionStage(c.mission, "briefing")
                  : c.mission
              };
            })
          };
        }),
      setMissionStage: (clientSlug, stage) =>
        set((state) => ({
          customClients: state.customClients.map((c) =>
            c.slug === clientSlug
              ? { ...c, mission: applyMissionStage(c.mission, stage) }
              : c
          )
        })),
      recordBriefForClient: (clientSlug, brief) =>
        set((state) => ({
          customClients: state.customClients.map((c) =>
            c.slug === clientSlug
              ? {
                  ...c,
                  latestBrief: brief,
                  mission: applyMissionStage(c.mission, "designing")
                }
              : c
          )
        })),
      appendSmartLabMessages: (clientSlug, messages, nextRulesMd) =>
        set((state) => ({
          customClients: state.customClients.map((c) =>
            c.slug === clientSlug
              ? {
                  ...c,
                  rulesMd: nextRulesMd ?? c.rulesMd,
                  smartLab: {
                    messages: [...(c.smartLab?.messages ?? []), ...messages],
                    lastUpdatedAt: Date.now()
                  }
                }
              : c
          )
        }))
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => localStorage),
      // `isWizardOpen` é estado de UI; não persistimos.
      partialize: (state) => ({ customClients: state.customClients }),
      // Migração defensiva: clientes salvos pela versão anterior não tinham
      // `mcpActivation`. Garante o default (Brand Brain on, restante off)
      // na primeira hidratação após o upgrade.
      onRehydrateStorage: () => (rehydrated) => {
        if (!rehydrated) return;
        rehydrated.customClients = rehydrated.customClients.map((c) => ({
          ...c,
          answers: upgradeClientAnswers(c.answers),
          mcpActivation: c.mcpActivation ?? defaultMcpActivation(),
          mission: c.mission ?? defaultMissionState(),
          latestBrief: c.latestBrief ?? null,
          smartLab: c.smartLab ?? defaultSmartLabSession()
        }));
      }
    }
  )
);

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Mapeia o `NpcId` para a flag correspondente em `McpActivationFlags`.
 * Retorna `null` para NPCs ambientais (smart-lab, orbit-garden), que não
 * participam do ciclo de ativação por cliente.
 */
export function mcpKeyForNpc(npcId: NpcId): keyof McpActivationFlags | null {
  switch (npcId) {
    case "brand-brain":
      return "brandBrain";
    case "editorial":
      return "editorial";
    case "design":
      return "design";
    case "narration":
      return "narration";
    case "output-review":
      return "socialMedia";
    default:
      return null;
  }
}

export function isMcpActivatedFor(
  record: CustomClientRecord,
  npcId: NpcId
): boolean {
  const key = mcpKeyForNpc(npcId);
  if (!key) return true; // NPCs ambientais não exigem ativação.
  return record.mcpActivation[key] === true;
}

/**
 * Mapeia um `CustomClientRecord` para o shape `ClientProfile` esperado pelo
 * resto do app (DialogueModal, useWorkflowStore.handleNpcAction).
 *
 * `capabilities` é derivado de `mcpActivation` — o NPC só "suporta" o cliente
 * quando o respectivo MCP está ativo.
 */
export function recordToClientProfile(record: CustomClientRecord): ClientProfile {
  const capabilities: ClientCapabilities = {
    brandBrain: record.mcpActivation.brandBrain,
    editorial: record.mcpActivation.editorial,
    design: record.mcpActivation.design,
    narration: record.mcpActivation.narration,
    outputReview: record.mcpActivation.socialMedia
  };
  return {
    slug: record.slug,
    displayName: record.displayName,
    status: "active",
    summary:
      record.answers.goal && record.answers.goal.length > 0
        ? record.answers.goal
        : `Cliente cadastrado pelo player em ${new Date(record.createdAt).toLocaleDateString("pt-BR")}.`,
    capabilities
  };
}

export function hasAnyCustomClient(state: ClientSetupState): boolean {
  return state.customClients.length > 0;
}
