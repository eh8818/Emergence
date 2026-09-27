"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";
import { ChevronDown, Circle, CircleCheck, ListFilter } from "lucide-react";
import { FolderFloat } from "@/components/ui/folder-float";
import type { CareTask, TaskStatus } from "@/lib/types";

type Filter = TaskStatus | "all";
const tabs: { value: Filter; label: string }[] = [{ value: "todo", label: "Open" }, { value: "in_progress", label: "In Progress" }, { value: "complete", label: "Completed" }, { value: "all", label: "All" }];
const order = { urgent: 0, high: 1, routine: 2 };
function moveTab(event: KeyboardEvent<HTMLDivElement>) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
  if (current < 0) return;
  event.preventDefault();
  const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
  tabs[next].focus(); tabs[next].click();
}

export function CoordinationQueue({ tasks, patientId, search, onStatus }: { tasks: CareTask[]; patientId: string; search: string; onStatus: (id: string, status: TaskStatus) => void }) {
  const [filter, setFilter] = useState<Filter>("todo");
  const [sort, setSort] = useState<"priority" | "category">("priority");
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = tasks.filter(task => (filter === "all" || task.status === filter) && (!search || [task.title, task.description, task.category, task.assignee].join(" ").toLowerCase().includes(search.toLowerCase()))).sort((a, b) => sort === "priority" ? order[a.priority] - order[b.priority] : a.category.localeCompare(b.category));
  const urgent = tasks.filter(task => task.priority === "urgent" && task.status !== "complete").length;
  const open = tasks.filter(task => task.status !== "complete").length;
  return <section className="workspace-region queue-rail" id="coordination" aria-labelledby="queue-title">
    <header className="pane-header"><h2 id="queue-title">Coordination Work Queue</h2><span>{open} open · {urgent} urgent</span></header>
    <div className="queue-tools"><ListFilter size={14} aria-hidden="true" /><label>Sort <select value={sort} onChange={event => setSort(event.target.value as "priority" | "category")}><option value="priority">Priority</option><option value="category">Category</option></select></label></div>
    {tasks.length ? <><div className="pane-tabs queue-tabs" role="tablist" aria-label="Task status" onKeyDown={moveTab}>{tabs.map(tab => <button key={tab.value} type="button" role="tab" tabIndex={filter === tab.value ? 0 : -1} aria-selected={filter === tab.value} onClick={() => setFilter(tab.value)}>{tab.label}<span>{tab.value === "all" ? tasks.length : tasks.filter(task => task.status === tab.value).length}</span></button>)}</div>
      <div className="queue-list">{filtered.length ? filtered.map(task => <article key={task.id} className={"queue-item queue-item--" + task.priority}>
        <button type="button" className="queue-item__summary" aria-expanded={selected === task.id} onClick={() => setSelected(selected === task.id ? null : task.id)}>
          <span className="queue-item__icon">{task.status === "complete" ? <CircleCheck size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}</span>
          <span className="queue-item__text"><strong>{task.title}</strong><small>{patientId} · {task.category} · {task.assignee} · {task.due_date || "No due date"}</small></span><ChevronDown size={14} aria-hidden="true" />
        </button>
        {selected === task.id && <div className="queue-item__detail"><p>{task.description}</p><dl><div><dt>Priority</dt><dd>{task.priority}</dd></div><div><dt>Due</dt><dd>{task.due_date || "No due date"}</dd></div><div><dt>Verification</dt><dd>Confirm with care team or external source</dd></div></dl><label>Status <select value={task.status} onChange={event => onStatus(task.id, event.target.value as TaskStatus)} aria-label={"Status for " + task.title}><option value="todo">Open</option><option value="in_progress">In progress</option><option value="complete">Complete</option></select></label></div>}
      </article>) : <p className="queue-empty-text">No tasks match this view.</p>}</div>
    </> : <div className="queue-empty"><FolderFloat /><strong>No coordination tasks yet</strong><p>Generate a draft plan to populate this demo-local work queue.</p></div>}
    <p className="queue-footnote">Demo-local task status. No hospital task system is connected.</p>
  </section>;
}
