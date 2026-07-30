"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronRight,
  ChevronDown,
  MessageSquare,
  Paperclip,
  ListTree,
  Plus,
  GripVertical,
} from "lucide-react";
import { CheckCircle } from "@/components/task/CheckCircle";
import { Avatar, AvatarEmpty } from "@/components/ui/Avatar";
import { TagPill } from "@/components/task/pickers";
import { ViewToolbar } from "./ViewToolbar";
import { useAppContext } from "@/components/layout/AppContext";
import { formatDue, formatDuration, isOverdue } from "@/lib/dates";
import { compareOrder } from "@/lib/ordering";
import { toggleComplete, createTask, moveTask, updateTask } from "@/actions/task";
import type { ViewFilters } from "@/lib/view-filters";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  dueAt: string | null;
  dueHasTime: boolean;
  estimatedMinutes: number | null;
  order: string;
  sectionId: string | null;
  assignee: { id: string; name: string; avatarColor: string } | null;
  tags: { id: string; name: string; color: string }[];
  counts: { subtasks: number; doneSubtasks: number; comments: number; attachments: number };
  subtasks: {
    id: string;
    title: string;
    completed: boolean;
    dueAt: string | null;
    dueHasTime: boolean;
    assignee: { id: string; name: string; avatarColor: string } | null;
  }[];
};

type Section = { id: string; name: string; order: string };

export function ListView({
  projectId,
  sections,
  tasks,
  tags,
  filters,
  sortBy,
  groupBy,
}: {
  projectId: string;
  sections: Section[];
  tasks: Task[];
  tags: { id: string; name: string; color: string }[];
  filters: ViewFilters;
  sortBy: string;
  groupBy: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { users } = useAppContext();

  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [dragging, setDragging] = useState<Task | null>(null);
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [, start] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const visible = useMemo(
    () =>
      tasks.filter((t) =>
        query ? t.title.toLowerCase().includes(query.toLowerCase()) : true,
      ),
    [tasks, query],
  );

  /** Grupos conforme "Agrupar" da toolbar. */
  const groups = useMemo(() => {
    const sortTasks = (list: Task[]) => {
      const arr = [...list];
      if (sortBy === "dueAt") {
        arr.sort((a, b) => {
          if (!a.dueAt) return 1;
          if (!b.dueAt) return -1;
          return a.dueAt.localeCompare(b.dueAt);
        });
      } else if (sortBy === "title") {
        arr.sort((a, b) => a.title.localeCompare(b.title));
      } else if (sortBy === "assignee") {
        arr.sort((a, b) => (a.assignee?.name ?? "zz").localeCompare(b.assignee?.name ?? "zz"));
      } else {
        arr.sort((a, b) => compareOrder(a.order, b.order));
      }
      return arr;
    };

    if (groupBy === "assignee") {
      const byUser = new Map<string, Task[]>();
      for (const t of visible) {
        const key = t.assignee?.id ?? "__none";
        byUser.set(key, [...(byUser.get(key) ?? []), t]);
      }
      return Array.from(byUser.entries()).map(([key, list]) => ({
        id: key,
        name: key === "__none" ? "Sem responsável" : (list[0].assignee?.name ?? ""),
        droppable: false,
        tasks: sortTasks(list),
      }));
    }

    if (groupBy === "none") {
      return [{ id: "__all", name: "Todas as tarefas", droppable: false, tasks: sortTasks(visible) }];
    }

    const out = sections.map((s) => ({
      id: s.id,
      name: s.name,
      droppable: true,
      tasks: sortTasks(visible.filter((t) => t.sectionId === s.id)),
    }));
    const orphans = visible.filter((t) => !t.sectionId);
    if (orphans.length) {
      out.push({ id: "__none", name: "Sem seção", droppable: true, tasks: sortTasks(orphans) });
    }
    return out;
  }, [visible, sections, groupBy, sortBy]);

  const manualDrag = sortBy === "manual" && groupBy === "section";

  function openTask(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("task", id);
    router.push(`?${next.toString()}`, { scroll: false });
  }

  function toggle(task: { id: string; completed: boolean }) {
    const next = !(optimistic[task.id] ?? task.completed);
    setOptimistic((p) => ({ ...p, [task.id]: next }));
    start(async () => {
      await toggleComplete(task.id, next);
      router.refresh();
    });
  }

  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const { active, over } = e;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    // over pode ser uma tarefa ou o cabeçalho de uma seção vazia.
    const overGroup = groups.find((g) => g.id === overId);
    const overTask = visible.find((t) => t.id === overId);
    const targetSectionId = overGroup
      ? overGroup.id === "__none"
        ? null
        : overGroup.id
      : (overTask?.sectionId ?? null);

    const list = groups.find((g) => (g.id ?? "") === (targetSectionId ?? "__none"))?.tasks ?? [];
    const idx = overTask ? list.findIndex((t) => t.id === overTask.id) : list.length;

    const before = idx > 0 ? list[idx - 1] : null;
    const after = overTask ? list[idx] : null;

    start(async () => {
      await moveTask({
        taskId: activeId,
        projectId,
        toSectionId: targetSectionId,
        beforeTaskId: before?.id ?? null,
        afterTaskId: after?.id ?? null,
      });
      router.refresh();
    });
  }

  return (
    <div className="flex h-full flex-col">
      <ViewToolbar
        projectId={projectId}
        viewType="list"
        filters={filters}
        sortBy={sortBy}
        groupBy={groupBy}
        users={users}
        tags={tags}
        query={query}
        onQuery={setQuery}
        onAddTask={() => setAddingIn(groups[0]?.id ?? null)}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Cabeçalho de colunas */}
        <div className="sticky top-0 z-10 grid grid-cols-[1fr_130px_96px_150px_44px] items-center gap-2 border-b border-line bg-ink px-5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
          <span>Nome da tarefa</span>
          <span>Prazo</span>
          <span>Duração</span>
          <span>Tags</span>
          <span className="text-center">Resp.</span>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(e: DragStartEvent) =>
            setDragging(visible.find((t) => t.id === String(e.active.id)) ?? null)
          }
          onDragEnd={onDragEnd}
        >
          {groups.map((g) => {
            const isCollapsed = collapsed[g.id];
            return (
              <section key={g.id}>
                <div className="flex items-center gap-1.5 px-5 pb-1 pt-4">
                  <button
                    onClick={() => setCollapsed((p) => ({ ...p, [g.id]: !p[g.id] }))}
                    className="rounded p-0.5 text-muted transition hover:bg-surface hover:text-text"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <h3 className="text-[12px] font-semibold text-text">{g.name}</h3>
                  <span className="text-[11px] text-faint">{g.tasks.length}</span>
                </div>

                {!isCollapsed && (
                  <SortableContext
                    items={g.tasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div id={g.id}>
                      {g.tasks.map((t) => (
                        <TaskRow
                          key={t.id}
                          task={t}
                          completed={optimistic[t.id] ?? t.completed}
                          expanded={!!expanded[t.id]}
                          draggable={manualDrag}
                          onExpand={() => setExpanded((p) => ({ ...p, [t.id]: !p[t.id] }))}
                          onToggle={() => toggle(t)}
                          onOpen={() => openTask(t.id)}
                          onToggleSubtask={(s) => toggle(s)}
                          optimistic={optimistic}
                          onOpenSubtask={openTask}
                          onRename={(title) =>
                            start(async () => {
                              await updateTask(t.id, { title });
                              router.refresh();
                            })
                          }
                        />
                      ))}

                      {g.tasks.length === 0 && (
                        <p className="px-5 py-2 text-[12px] text-faint">Nenhuma tarefa aqui.</p>
                      )}

                      <InlineAdd
                        active={addingIn === g.id}
                        onActivate={() => setAddingIn(g.id)}
                        onCancel={() => setAddingIn(null)}
                        onCreate={(title) =>
                          start(async () => {
                            await createTask({
                              title,
                              projectId,
                              sectionId: g.droppable && g.id !== "__none" ? g.id : null,
                            });
                            router.refresh();
                          })
                        }
                      />
                    </div>
                  </SortableContext>
                )}
              </section>
            );
          })}

          <DragOverlay>
            {dragging && (
              <div className="card px-3 py-2 text-[13px] shadow-2xl">{dragging.title}</div>
            )}
          </DragOverlay>
        </DndContext>

        <div className="h-16" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function TaskRow({
  task,
  completed,
  expanded,
  draggable,
  onExpand,
  onToggle,
  onOpen,
  onRename,
  onToggleSubtask,
  onOpenSubtask,
  optimistic,
}: {
  task: Task;
  completed: boolean;
  expanded: boolean;
  draggable: boolean;
  onExpand: () => void;
  onToggle: () => void;
  onOpen: () => void;
  onRename: (title: string) => void;
  onToggleSubtask: (s: { id: string; completed: boolean }) => void;
  onOpenSubtask: (id: string) => void;
  optimistic: Record<string, boolean>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !draggable,
  });

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const due = task.dueAt ? new Date(task.dueAt) : null;
  const overdue = isOverdue(due, completed);

  return (
    <>
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={`group grid cursor-pointer grid-cols-[1fr_130px_96px_150px_44px] items-center gap-2 border-b border-line/60 px-5 py-[7px] transition hover:bg-graphite ${
          isDragging ? "opacity-40" : ""
        }`}
        onClick={onOpen}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {draggable && (
            <button
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              className="cursor-grab text-transparent transition group-hover:text-faint"
              aria-label="Arrastar"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
            className={`rounded p-0.5 transition hover:bg-surface ${
              task.counts.subtasks > 0 ? "text-muted" : "invisible"
            }`}
            aria-label="Expandir subtarefas"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>

          <CheckCircle completed={completed} onToggle={onToggle} />

          {editing ? (
            <input
              autoFocus
              value={title}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                setEditing(false);
                if (title.trim() && title.trim() !== task.title) onRename(title.trim());
                else setTitle(task.title);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  setTitle(task.title);
                  setEditing(false);
                }
              }}
              className="min-w-0 flex-1 rounded bg-surface px-1.5 py-0.5 text-[13px] outline-none"
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              className={`min-w-0 flex-1 truncate text-[13px] ${
                completed ? "text-faint line-through" : "text-text"
              }`}
              title={task.title}
            >
              {task.title}
            </span>
          )}

          <span className="flex shrink-0 items-center gap-2 text-[10px] text-faint">
            {task.counts.subtasks > 0 && (
              <span className="flex items-center gap-0.5" title="Subtarefas">
                <ListTree className="h-3 w-3" />
                {task.counts.doneSubtasks}/{task.counts.subtasks}
              </span>
            )}
            {task.counts.comments > 0 && (
              <span className="flex items-center gap-0.5" title="Comentários">
                <MessageSquare className="h-3 w-3" />
                {task.counts.comments}
              </span>
            )}
            {task.counts.attachments > 0 && (
              <span className="flex items-center gap-0.5" title="Anexos">
                <Paperclip className="h-3 w-3" />
                {task.counts.attachments}
              </span>
            )}
          </span>
        </div>

        <span className={`truncate text-[12px] ${overdue ? "text-brand" : "text-muted"}`}>
          {due ? formatDue(due, task.dueHasTime) : ""}
        </span>

        <span className="truncate text-[12px] text-muted">
          {formatDuration(task.estimatedMinutes)}
        </span>

        <span className="flex flex-wrap gap-1 overflow-hidden">
          {task.tags.slice(0, 2).map((t) => (
            <TagPill key={t.id} tag={t} size="sm" />
          ))}
          {task.tags.length > 2 && (
            <span className="text-[10px] text-faint">+{task.tags.length - 2}</span>
          )}
        </span>

        <span className="flex justify-center">
          {task.assignee ? (
            <Avatar
              name={task.assignee.name}
              color={task.assignee.avatarColor}
              size="sm"
            />
          ) : (
            <AvatarEmpty size="sm" />
          )}
        </span>
      </div>

      {expanded &&
        task.subtasks.map((s) => {
          const sDone = optimistic[s.id] ?? s.completed;
          const sDue = s.dueAt ? new Date(s.dueAt) : null;
          return (
            <div
              key={s.id}
              onClick={() => onOpenSubtask(s.id)}
              className="grid cursor-pointer grid-cols-[1fr_130px_96px_150px_44px] items-center gap-2 border-b border-line/40 bg-graphite/40 py-[6px] pl-[68px] pr-5 transition hover:bg-graphite"
            >
              <div className="flex min-w-0 items-center gap-2">
                <CheckCircle
                  completed={sDone}
                  size="sm"
                  onToggle={() => onToggleSubtask(s)}
                />
                <span
                  className={`min-w-0 truncate text-[12.5px] ${
                    sDone ? "text-faint line-through" : "text-dim"
                  }`}
                >
                  {s.title}
                </span>
              </div>
              <span
                className={`truncate text-[11px] ${
                  isOverdue(sDue, sDone) ? "text-brand" : "text-faint"
                }`}
              >
                {sDue ? formatDue(sDue, s.dueHasTime) : ""}
              </span>
              <span />
              <span />
              <span className="flex justify-center">
                {s.assignee ? (
                  <Avatar name={s.assignee.name} color={s.assignee.avatarColor} size="xs" />
                ) : (
                  <AvatarEmpty size="xs" />
                )}
              </span>
            </div>
          );
        })}
    </>
  );
}

/* -------------------------------------------------------------------------- */

function InlineAdd({
  active,
  onActivate,
  onCancel,
  onCreate,
}: {
  active: boolean;
  onActivate: () => void;
  onCancel: () => void;
  onCreate: (title: string) => void;
}) {
  const [title, setTitle] = useState("");

  if (!active) {
    return (
      <button
        onClick={onActivate}
        className="flex w-full items-center gap-2 px-5 py-2 text-[12.5px] text-faint transition hover:bg-graphite hover:text-dim"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar tarefa…
      </button>
    );
  }

  return (
    <div className="px-5 py-1.5">
      <input
        autoFocus
        value={title}
        placeholder="Título e Enter — o cursor fica pronto para a próxima"
        className="w-full rounded-md border border-brand bg-surface px-2.5 py-1.5 text-[13px] outline-none placeholder:text-faint"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) {
            onCreate(title.trim());
            setTitle("");
          } else if (e.key === "Escape") {
            setTitle("");
            onCancel();
          }
        }}
        onBlur={() => {
          if (title.trim()) onCreate(title.trim());
          setTitle("");
          onCancel();
        }}
      />
    </div>
  );
}
