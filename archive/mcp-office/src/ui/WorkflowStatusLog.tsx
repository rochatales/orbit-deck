import { ClipboardList } from "lucide-react";
import { useWorkflowStore } from "../state/useWorkflowStore";

export function WorkflowStatusLog() {
  const logEntries = useWorkflowStore((state) => state.logEntries);

  return (
    <section className="log-panel">
      <div className="panel-heading">
        <ClipboardList size={16} />
        <span className="panel-title">Log de Status</span>
      </div>
      <div className="log-list">
        {logEntries.map((entry, index) => (
          <div key={`${entry}-${index}`} className="log-item">
            {entry}
          </div>
        ))}
      </div>
    </section>
  );
}
