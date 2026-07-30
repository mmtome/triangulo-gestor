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
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Check, Plus, CalendarOff, ListTree } from "lucide-react";
import { ViewToolbar } from "./ViewToolbar";
import { Popover } from "@/components/ui/Popover";
import { useAppContext } from "@/components/layout/AppContext";
import { monthTitle } from "@/lib/dates";
import { updateTask, createTask } from "@/actions/task";
import type { ViewFilters } from "@/lib/view-filters";
import type { SerializedTask } from "@/lib/serialize";

const WEEKDAYS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

export function CalendarView({
  projectId,
  tasks,
  tags,
  filters,
  sortBy,
  groupBy,
}: {
  projectId: string;
  tasks: SerializedTask[];
  tags: { id: string; name: string; color: string }[];
  filters: ViewFilters;
  sortBy: string;
  groupBy: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { users } = useAppContext();

  // Abrir sempre no mês corrente mostra uma grade vazia quando o ciclo está
  // planejado para o mês seguinte. Começa no mês que de fato tem trabalho.
  const [cursor, setCursor] = useState(() => {
    const today = new Date();
    const dated = tasks
      .filter((t) => t.dueAt)
      .map((t) => new Date(t.dueAt as string))
      .sort((a, b) => a.getTime() - b.getTime());
    if (dated.length === 0) return today;
    if (dated.some((d) => isSameMonth(d, today))) return today;
    return dated.find((d) => d >= today) ?? dated[dated.length - 1];
  });
  const [query, setQuery] = useState("");
  const [showUndated, setShowUndated] = useState(false);
  const [dragging, setDragging] = useState<SerializedTask | null>(null);
  const [, start] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const visible = useMemo(
    () =>
      tasks.filter((t) =>
        query ? t.title.toLowerCase().includes(query.toLowerCase()) : true,
      ),
    [tasks, query],
  );

  const undated = visible.filter((t) => !t.dueAt);

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [cursor]);

  /** Tarefas por dia. Multi-dia (startAt→dueAt) aparece em todos os dias do intervalo. */
  const byDay = useMemo(() => {
    const map = new Map<string, { task: SerializedTask; span: "single" | "start" | "mid" | "end" }[]>();
    const push = (
      d: Date,
      task: SerializedTask,
      span: "single" | "start" | "mid" | "end",
    ) => {
      const key = format(d, "yyyy-MM-dd");
      map.set(key, [...(map.get(key) ?? []), { task, span }]);
    };

    for (const t of visible) {
      if (!t.dueAt) continue;
      const due = new Date(t.dueAt);
      const startAt = t.startAt ? new Date(t.startAt) : null;

      if (startAt && !isSameDay(startAt, due) && startAt < due) {
        const range = eachDayOfInterval({ start: startAt, end: due });
        range.forEach((d, i) =>
          push(d, t, i === 0 ? "start" : i === range.length - 1 ? "end" : "mid"),
        );
      } else {
        push(due, t, "single");
      }
    }
    return map;
  }, [visible]);

  function openTask(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("task", id);
    router.push(`?${next.toString()}`, { scroll: false });
  }

  function onDragEnd(e: DragEndEvent) {
    const task = dragging;
    setDragging(null);
    const { over } = e;
    if (!over || !task) return;

    const dayKey = String(over.id).replace("day:", "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return;

    // Mantém a hora original ao mudar o dia (CA da seção 5.9).
    const [y, m, d] = dayKey.split("-").map(Number);
    const old = task.dueAt ? new Date(task.dueAt) : null;
    const next = new Date(y, m - 1, d, old?.getHours() ?? 12, old?.getMinutes() ?? 0, 0, 0);

    start(async () => {
      await updateTask(task.id, { dueAt: next.toISOString(), dueHasTime: task.dueHasTime });
      router.refresh();
    });
  }

  return (
    <div className="flex h-full flex-col">
      <ViewToolbar
        projectId={projectId}
        viewType="calendar"
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

      <div className="flex shrink-0 items-center gap-2 px-5 py-2.5">
        <button
          onClick={() => setCursor((c) => addMonths(c, -1))}
          className="rounded p-1 text-muted transition hover:bg-surface hover:text-text"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => setCursor((c) => addMonths(c, 1))}
          className="rounded p-1 text-muted transition hover:bg-surface hover:text-text"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <h2 className="ml-1 text-[15px] font-semibold tracking-tight">{monthTitle(cursor)}</h2>
        <button className="btn-ghost py-1 text-[12px]" onClick={() => setCursor(new Date())}>
          Hoje
        </button>

        <button
          onClick={() => setShowUndated((v) => !v)}
          className={`btn-ghost ml-auto py-1 text-[12px] ${
            showUndated ? "border-brand text-brand" : ""
          }`}
        >
          <CalendarOff className="h-3.5 w-3.5" />
          Sem data ({undated.length})
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={(e: DragStartEvent) =>
          setDragging(visible.find((t) => t.id === String(e.active.id)) ?? null)
        }
        onDragEnd={onDragEnd}
      >
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-y-auto px-5 pb-5">
            <div className="grid grid-cols-7 border-b border-line">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((day) => (
                <DayCell
                  key={day.toISOString()}
                  day={day}
                  cursor={cursor}
                  entries={byDay.get(format(day, "yyyy-MM-dd")) ?? []}
                  onOpen={openTask}
                  onQuickCreate={(title) =>
                    start(async () => {
                      const d = new Date(
                        day.getFullYear(),
                        day.getMonth(),
                        day.getDate(),
                        12,
                        0,
                      );
                      await createTask({
                        title,
                        projectId,
                        dueAt: d.toISOString(),
                        dueHasTime: false,
                      });
                      router.refresh();
                    })
                  }
                />
              ))}
            </div>
          </div>

          {showUndated && (
            <aside className="w-64 shrink-0 overflow-y-auto border-l border-line bg-graphite p-3">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
                Sem data ({undated.length})
              </h3>
              {undated.length === 0 && (
                <p className="text-[12px] text-faint">Tudo agendado. Bom sinal.</p>
              )}
              {undated.map((t) => (
                <Pill key={t.id} task={t} span="single" onOpen={() => openTask(t.id)} />
              ))}
              <p className="mt-3 text-[11px] leading-relaxed text-faint">
                Arraste para um dia do calendário para definir o prazo.
              </p>
            </aside>
          )}
        </div>

        <DragOverlay>
          {dragging && (
            <div className="rounded bg-brand px-2 py-1 text-[11px] text-white shadow-2xl">
              {dragging.title}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function DayCell({
  day,
  cursor,
  entries,
  onOpen,
  onQuickCreate,
}: {
  day: Date;
  cursor: Date;
  entries: { task: SerializedTask; span: "single" | "start" | "mid" | "end" }[];
  onOpen: (id: string) => void;
  onQuickCreate: (title: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${format(day, "yyyy-MM-dd")}` });
  const [adding, setAdding] = useState(false);
  const outside = !isSameMonth(day, cursor);
  const MAX = 3;

  return (
    <div
      ref={setNodeRef}
      className={`group min-h-[104px] border-b border-r border-line p-1.5 transition ${
        outside ? "bg-ink/60" : ""
      } ${isOver ? "bg-brand-soft" : ""}`}
    >
      <div className="mb-1 flex items-center justify-between">
        <span
          className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] ${
            isToday(day)
              ? "bg-brand font-semibold text-white"
              : outside
                ? "text-faint"
                : "text-muted"
          }`}
        >
          {format(day, "d")}
        </span>
        <button
          onClick={() => setAdding(true)}
          className="rounded p-0.5 text-transparent transition group-hover:text-faint hover:!text-brand"
          aria-label="Adicionar tarefa neste dia"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {entries.slice(0, MAX).map(({ task, span }) => (
        <Pill key={`${task.id}-${span}`} task={task} span={span} onOpen={() => onOpen(task.id)} />
      ))}

      {entries.length > MAX && (
        <Popover
          width="w-56"
          trigger={({ toggle }) => (
            <button
              onClick={toggle}
              className="mt-0.5 px-1 text-[10px] text-faint transition hover:text-brand"
            >
              Mais {entries.length - MAX}
            </button>
          )}
        >
          {() => (
            <div className="max-h-64 overflow-y-auto p-1.5">
              <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-faint">
                {format(day, "dd/MM")}
              </div>
              {entries.map(({ task, span }) => (
                <Pill
                  key={`pop-${task.id}`}
                  task={task}
                  span={span}
                  onOpen={() => onOpen(task.id)}
                  draggableEnabled={false}
                />
              ))}
            </div>
          )}
        </Popover>
      )}

      {adding && (
        <input
          autoFocus
          placeholder="Nova tarefa"
          className="mt-1 w-full rounded border border-brand bg-surface px-1.5 py-1 text-[11px] outline-none"
          onKeyDown={(e) => {
            const v = (e.target as HTMLInputElement).value.trim();
            if (e.key === "Enter" && v) {
              onQuickCreate(v);
              setAdding(false);
            } else if (e.key === "Escape") setAdding(false);
          }}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v) onQuickCreate(v);
            setAdding(false);
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Pill({
  task,
  span,
  onOpen,
  draggableEnabled = true,
}: {
  task: SerializedTask;
  span: "single" | "start" | "mid" | "end";
  onOpen: () => void;
  draggableEnabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled: !draggableEnabled,
  });

  // A cor vem da 1ª tag; sem tag, cinza (CA da seção 5.9).
  const color = task.tags[0]?.color ?? "#6B6B73";
  const due = task.dueAt ? new Date(task.dueAt) : null;

  const radius =
    span === "single"
      ? "rounded"
      : span === "start"
        ? "rounded-l"
        : span === "end"
          ? "rounded-r"
          : "";

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={`mb-0.5 flex cursor-pointer items-center gap-1 px-1.5 py-[3px] text-[10px] leading-tight transition hover:brightness-125 ${radius} ${
        isDragging ? "opacity-30" : ""
      }`}
      style={{
        backgroundColor: `${color}2E`,
        color,
        borderLeft: span === "mid" || span === "end" ? "none" : `2px solid ${color}`,
      }}
      title={task.title}
    >
      {task.completed && <Check className="h-2.5 w-2.5 shrink-0" strokeWidth={3} />}
      {due && task.dueHasTime && span !== "mid" && (
        <span className="shrink-0 font-semibold opacity-80">{format(due, "HH:mm")}</span>
      )}
      <span className={`min-w-0 truncate ${task.completed ? "line-through opacity-60" : ""}`}>
        {task.title}
      </span>
      {task.counts.subtasks > 0 && (
        <span className="ml-auto flex shrink-0 items-center gap-0.5 opacity-70">
          <ListTree className="h-2.5 w-2.5" />
          {task.counts.doneSubtasks}/{task.counts.subtasks}
        </span>
      )}
    </div>
  );
}
