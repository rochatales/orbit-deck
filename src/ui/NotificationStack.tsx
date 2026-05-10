import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Clock3, LoaderCircle } from "lucide-react";
import { useWorkflowStore, type WorkflowNotificationPhase } from "../state/useWorkflowStore";
import { getActionMeta } from "./actionMeta";

function getPhaseMeta(phase: WorkflowNotificationPhase) {
  switch (phase) {
    case "pending":
      return { label: "Pendente", Icon: Clock3 };
    case "running":
      return { label: "Executando", Icon: LoaderCircle };
    case "complete":
      return { label: "Concluído", Icon: CheckCircle2 };
    case "error":
      return { label: "Erro", Icon: AlertCircle };
  }
}

export function NotificationStack() {
  const notifications = useWorkflowStore((state) => state.notifications);

  return (
    <div className="notification-stack" aria-live="polite">
      <AnimatePresence initial={false}>
        {notifications.map((notification) => {
          const actionMeta = notification.actionId ? getActionMeta(notification.actionId) : { icon: CheckCircle2, shortLabel: "Sistema" };
          const phaseMeta = getPhaseMeta(notification.phase);
          const PhaseIcon = phaseMeta.Icon;
          const ActionIcon = actionMeta.icon;

          return (
            <motion.article
              key={notification.id}
              className={`notification-card notification-${notification.phase}`}
              initial={{ opacity: 0, x: 24, y: -8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 32, scale: 0.98 }}
              layout
            >
              <span className="notification-accent" style={{ backgroundColor: notification.accentColor }} />
              <div className="notification-icon">
                <ActionIcon size={16} />
              </div>
              <div className="notification-content">
                <div className="notification-header">
                  <span className="notification-title">{notification.title}</span>
                  <span className="notification-phase">
                    <PhaseIcon size={14} className={notification.phase === "running" ? "spin" : undefined} />
                    {phaseMeta.label}
                  </span>
                </div>
                <div className="notification-subtitle">{notification.npcName}</div>
                <p className="notification-message">{notification.message}</p>
              </div>
            </motion.article>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
