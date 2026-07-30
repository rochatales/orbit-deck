import { AGENT_STATE_META, type AgentRuntimeInfo } from "./agentStatus";
import type { NpcId } from "./mcpActions";
import type { CustomClientRecord, SmartLabMessage } from "../state/useClientSetupStore";

export interface SmartLabUsageRow {
  clientSlug: string;
  label: string;
  value: number;
  messages: number;
  rulesSize: number;
}

export interface SmartLabGraphPoint {
  label: string;
  value: number;
}

export interface SmartLabDiagnosticLine {
  prefix: "ON" | "OFF";
  tone: "ok" | "warn" | "muted";
  label: string;
  value: string;
}

export interface SmartLabOverviewMetrics {
  totalClients: number;
  activeClients: number;
  activeClientLabel: string;
  totalMessages: number;
  graphPoints: SmartLabGraphPoint[];
  usageRows: SmartLabUsageRow[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function shortDayLabel(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  });
}

export function getClientUsageValue(client: CustomClientRecord) {
  const messages = client.smartLab?.messages ?? [];
  const rulesSize = client.rulesMd.trim().length;
  const missionWeight = Math.max(client.mission.stage === "idle" ? 0 : 1, 0);
  return messages.length * 12 + Math.round(rulesSize / 180) + missionWeight * 8;
}

export function buildSmartLabOverviewMetrics(
  clients: CustomClientRecord[],
  selectedClient: CustomClientRecord | null,
  now = Date.now()
): SmartLabOverviewMetrics {
  const usageRows = clients
    .map((client) => {
      const messages = client.smartLab?.messages ?? [];
      return {
        clientSlug: client.slug,
        label: client.displayName,
        value: getClientUsageValue(client),
        messages: messages.length,
        rulesSize: client.rulesMd.trim().length
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const graphWindowDays = 21;
  const today = startOfDay(now);
  const graphPoints = Array.from({ length: graphWindowDays }, (_, index) => {
    const dayStart = today - (graphWindowDays - index - 1) * DAY_MS;
    const dayEnd = dayStart + DAY_MS;

    const createdClients = clients.filter(
      (client) => client.createdAt >= dayStart && client.createdAt < dayEnd
    ).length;

    const messageEvents = clients.reduce((total, client) => {
      const messages = client.smartLab?.messages ?? [];
      return (
        total +
        messages.filter(
          (message) => message.createdAt >= dayStart && message.createdAt < dayEnd
        ).length
      );
    }, 0);

    return {
      label: shortDayLabel(dayStart),
      value: createdClients * 18 + messageEvents * 7
    };
  });

  return {
    totalClients: clients.length,
    activeClients: clients.filter((client) => client.mcpActivation.brandBrain).length,
    activeClientLabel: selectedClient?.displayName ?? "Nenhum cliente selecionado",
    totalMessages: clients.reduce(
      (total, client) => total + (client.smartLab?.messages ?? []).length,
      0
    ),
    graphPoints,
    usageRows
  };
}

export function buildSmartLabDiagnostics(
  agentStatuses: Array<{
    npcId: NpcId;
    label: string;
    info: AgentRuntimeInfo;
  }>
): SmartLabDiagnosticLine[] {
  return agentStatuses.map(({ label, info }) => {
    const isOn = info.state === "active" || info.state === "busy";
    return {
      prefix: isOn ? "ON" : "OFF",
      tone: isOn ? "ok" : info.state === "error" || info.state === "offline" ? "warn" : "muted",
      label,
      value: AGENT_STATE_META[info.state].label.toUpperCase()
    };
  });
}

export function buildRulesSnapshot(client: CustomClientRecord) {
  const messages = client.smartLab?.messages ?? [];
  const userMessages = messages.filter((message) => message.role === "user").length;
  const assistantMessages = messages.filter((message) => message.role === "assistant").length;
  const lastUpdatedAt = client.smartLab?.lastUpdatedAt;

  return {
    userMessages,
    assistantMessages,
    lastUpdatedLabel: lastUpdatedAt
      ? new Date(lastUpdatedAt).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        })
      : "Ainda sem revisoes"
  };
}

export function getOverviewSubtitle(metrics: SmartLabOverviewMetrics) {
  return `${metrics.totalClients} clientes | ${metrics.totalMessages} mensagens | foco em ${metrics.activeClientLabel}`;
}

export function getUsagePercentage(value: number, topValue: number) {
  if (topValue <= 0) return 0;
  return Math.max(8, Math.round((value / topValue) * 100));
}

export function getGraphBarPercentage(value: number, topValue: number) {
  if (topValue <= 0) return 0;
  return Math.max(10, Math.round((value / topValue) * 100));
}
