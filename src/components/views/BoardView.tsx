"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MessageSquare, Paperclip, ListTree, Plus, MoreHorizontal } from "lucide-react";
import { CheckCircle } from "@/components/task/CheckCircle";
import { Avatar } from "@/components/ui/Avatar";
import { TagPill } from "@/components/task/pickers";
import { Popover } from "@/components/ui/Popover";
import { ViewToolbar } from "./ViewToolbar";
import { useAppContext } from "@/components/layout/AppContext";
import { formatDue, isOverdue } from "@/lib/dates";
import { toggleComplete, createTask, moveTask } from "@/actions/task";
import { createSection, renameSection, deleteSection } from "@/actions/section";
import type { ViewFilters } from "@/lib/view-filters";
import { compareOrder } from "@/lib/ordering";
import { attachmentUrl } from "@/lib/attachment-url";
import type { SerializedTask } from "@/lib/serialize";

type Section = { id: string; name: string; order: string };

export function BoardView({
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
  tasks: SerializedTask[];
  tags: { id: string; name: string; color: string }[];
  filters: ViewFilters;
  sortBy: string;
  groupBy: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { users } = useAppContext();

  const [query, setQuery] = useState("");
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [dragging, setDragging] = useState<SerializedTask | null>(null);
  const [newSection, setNewSection] = useState(false);
  const [, start] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const columns = useMemo(() => {
    const visible = tasks.filter((t) =>
      query ? t.title.toLowerCase().includes(query.toLowerCase()) : true,
    );
    const cols = sections.map((s) => ({
      id: s.id,
      name: s.name,
      tasks: visible
        .filter((t) => t.sectionId === s.id)
        .sort((a, b) => compareOrder(a.order, b.order)),
    }));
    const orphans = visible.filter((t) => !t.sectionId);
    if (orphans.length) {
      cols.push({
        id: "__none",
        name: "Sem seção",
        tasks: orphans.sort((a, b) => compareOrder(a.order, b.order)),
      });
    }
    return cols;
  }, [tasks, sections, query]);

  function openTask(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("task", id);
    router.push(`?${next.toString()}`, { scroll: false });
  }

  function toggle(task: SerializedTask) {
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

    // over é uma coluna (droppable "col:<id>") ou outro card.
    let targetColId: string;
    let overTask: SerializedTask | undefined;

    if (overId.startsWith("col:")) {
      targetColId = overId.slice(4);
    } else {
      overTask = tasks.find((t) => t.id === overId);
      if (!overTask) return;
      targetColId = overTask.sectionId ?? "__none";
    }

    const list = columns.find((c) => c.id === targetColId)?.tasks.filter((t) => t.id !== activeId) ?? [];
    const idx = overTask ? list.findIndex((t) => t.id === overTask!.id) : list.length;
    const before = idx > 0 ? list[idx - 1] : null;
    const after = overTask ? list[idx] : null;

    start(async () => {
      await moveTask({
        taskId: activeId,
        projectId,
        toSectionId: targetColId === "__none" ? null : targetColId,
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
        viewType="board"
        filters={filters}
        sortBy={sortBy}
        groupBy={groupBy}
        users={users}
        tags={tags}
        query={query}
        onQuery={setQuery}
        showSort={false}
        showGroup={false}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={(e: DragStartEvent) =>
          setDragging(tasks.find((t) => t.id === String(e.active.id)) ?? null)
        }
        onDragEnd={onDragEnd}
      >
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden p-5">
          <div className="flex h-full items-start gap-3">
            {columns.map((c) => (
              <Column
                key={c.id}
                column={c}
                projectId={projectId}
                optimistic={optimistic}
                onOpen={openTask}
                onToggle={toggle}
                onCreate={(title) =>
                  start(async () => {
                    await createTask({
                      title,
                      projectId,
                      sectionId: c.id === "__none" ? null : c.id,
                    });
                    router.refresh();
                  })
                }
                onRename={(name) =>
                  start(async () => {
                    await renameSection(c.id, name);
                    router.refresh();
                  })
                }
                onDelete={() =>
                  start(async () => {
                    await deleteSection(c.id, sections.find((s) => s.id !== c.id)?.id ?? null);
                    router.refresh();
                  })
                }
              />
            ))}

            {/* Nova seção */}
            <div className="w-[276px] shrink-0">
              {newSection ? (
                <input
                  autoFocus
                  placeholder="Nome da seção e Enter"
                  className="w-full rounded-md border border-brand bg-surface px-3 py-2 text-[13px] outline-none"
                  onKeyDown={(e) => {
                    const v = (e.target as HTMLInputElement).value.trim();
                    if (e.key === "Enter" && v) {
                      setNewSection(false);
                      start(async () => {
                        await createSection(projectId, v);
                        router.refresh();
                      });
                    } else if (e.key === "Escape") setNewSection(false);
                  }}
                  onBlur={() => setNewSection(false)}
                />
              ) : (
                <button
                  onClick={() => setNewSection(true)}
                  className="flex w-full items-center gap-2 rounded-md border border-dashed border-line px-3 py-2 text-[13px] text-faint transition hover:border-faint hover:text-dim"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar seção
                </button>
              )}
            </div>
          </div>
        </div>

        <DragOverlay>
          {dragging && (
            <div className="card w-[264px] rotate-2 p-3 text-[13px] shadow-2xl">
              {dragging.title}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Column({
  column,
  projectId,
  optimistic,
  onOpen,
  onToggle,
  onCreate,
  onRename,
  onDelete,
}: {
  column: { id: string; name: string; tasks: SerializedTask[] };
  projectId: string;
  optimistic: Record<string, boolean>;
  onOpen: (id: string) => void;
  onToggle: (t: SerializedTask) => void;
  onCreate: (title: string) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${column.id}` });
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex h-full w-[276px] shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        {editing ? (
          <input
            autoFocus
            defaultValue={column.name}
            className="min-w-0 flex-1 rounded bg-surface px-1.5 py-0.5 text-[12.5px] font-semibold outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setEditing(false);
            }}
            onBlur={(e) => {
              setEditing(false);
              const v = e.target.value.trim();
              if (v && v !== column.name) onRename(v);
            }}
          />
        ) : (
          <h3
            onDoubleClick={() => column.id !== "__none" && setEditing(true)}
            className="min-w-0 flex-1 truncate text-[12.5px] font-semibold"
          >
            {column.name}
          </h3>
        )}
        <span className="text-[11px] text-faint">{column.tasks.length}</span>
        {column.id !== "__none" && (
          <Popover
            align="right"
            width="w-44"
            trigger={({ toggle }) => (
              <button
                onClick={toggle}
                className="rounded p-0.5 text-muted transition hover:bg-surface hover:text-text"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            )}
          >
            {({ close }) => (
              <div className="py-1">
                <button
                  className="block w-full px-3 py-1.5 text-left text-[12px] transition hover:bg-surface"
                  onClick={() => {
                    close();
                    setEditing(true);
                  }}
                >
                  Renomear seção
                </button>
                <button
                  className="block w-full px-3 py-1.5 text-left text-[12px] text-brand transition hover:bg-surface"
                  onClick={() => {
                    close();
                    if (
                      confirm(
                        `Excluir a seção "${column.name}"? As tarefas vão para a primeira seção restante.`,
                      )
                    )
                      onDelete();
                  }}
                >
                  Excluir seção
                </button>
              </div>
            )}
          </Popover>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={`min-h-0 flex-1 overflow-y-auto rounded-lg border p-2 transition ${
          isOver ? "border-brand bg-brand-soft/40" : "border-line bg-graphite/50"
        }`}
      >
        <SortableContext items={column.tasks.map((t) => t.id)} strategy={rectSortingStrategy}>
          {column.tasks.map((t) => (
            <Card
              key={t.id}
              task={t}
              completed={optimistic[t.id] ?? t.completed}
              onOpen={() => onOpen(t.id)}
              onToggle={() => onToggle(t)}
            />
          ))}
        </SortableContext>

        {adding ? (
          <input
            autoFocus
            placeholder="Título e Enter"
            className="mt-1 w-full rounded-md border border-brand bg-surface px-2.5 py-2 text-[12.5px] outline-none"
            onKeyDown={(e) => {
              const v = (e.target as HTMLInputElement).value.trim();
              if (e.key === "Enter" && v) {
                onCreate(v);
                (e.target as HTMLInputElement).value = "";
              } else if (e.key === "Escape") setAdding(false);
            }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v) onCreate(v);
              setAdding(false);
            }}
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mt-1 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] text-faint transition hover:bg-surface hover:text-dim"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar tarefa
          </button>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Card({
  task,
  completed,
  onOpen,
  onToggle,
}: {
  task: SerializedTask;
  completed: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  const due = task.dueAt ? new Date(task.dueAt) : null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={`group mb-2 cursor-pointer overflow-hidden rounded-lg border border-line bg-graphite transition hover:border-faint ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      {task.coverKey && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={attachmentUrl(task.coverKey)}
          alt=""
          className="h-28 w-full object-cover"
        />
      )}

      <div className="p-2.5">
        {task.tags.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {task.tags.map((t) => (
              <TagPill key={t.id} tag={t} size="sm" />
            ))}
          </div>
        )}

        <div className="flex items-start gap-2">
          <span className="pt-0.5 opacity-0 transition group-hover:opacity-100">
            <CheckCircle completed={completed} size="sm" onToggle={onToggle} />
          </span>
          <p
            className={`min-w-0 flex-1 text-[12.5px] leading-snug ${
              completed ? "text-faint line-through" : "text-text"
            }`}
          >
            {task.title}
          </p>
        </div>

        <div className="mt-2 flex items-center gap-2 text-[10px] text-faint">
          {due && (
            <span className={isOverdue(due, completed) ? "text-brand" : ""}>
              {formatDue(due, task.dueHasTime)}
            </span>
          )}
          {task.counts.subtasks > 0 && (
            <span className="flex items-center gap-0.5">
              <ListTree className="h-3 w-3" />
              {task.counts.doneSubtasks}/{task.counts.subtasks}
            </span>
          )}
          {task.counts.comments > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquare className="h-3 w-3" />
              {task.counts.comments}
            </span>
          )}
          {task.counts.attachments > 0 && (
            <span className="flex items-center gap-0.5">
              <Paperclip className="h-3 w-3" />
              {task.counts.attachments}
            </span>
          )}
          <span className="ml-auto">
            {task.assignee && (
              <Avatar
                name={task.assignee.name}
                color={task.assignee.avatarColor}
                size="xs"
              />
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
