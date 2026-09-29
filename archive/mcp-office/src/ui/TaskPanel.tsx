import { Circle, CircleCheck, ListTodo, LoaderCircle } from "lucide-react";
import { useWorkflowStore } from "../state/useWorkflowStore";

export function TaskPanel() {
  const tasks = useWorkflowStore((state) => state.tasks);

  return (
    <section className="task-panel">
      <div className="panel-heading">
        <ListTodo size={16} />
        <span className="panel-title">Execução Atual</span>
      </div>
      <ul className="task-list">
        {tasks.map((task) => (
          <li key={task.id} className={`task-item task-item-${task.status}`}>
            {task.status === "completed" ? (
              <CircleCheck size={15} />
            ) : task.status === "active" ? (
              <LoaderCircle size={15} className="spin" />
            ) : (
              <Circle size={15} />
            )}
            <span>{task.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
