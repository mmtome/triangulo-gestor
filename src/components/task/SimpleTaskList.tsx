"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { CheckCircle } from "./CheckCircle";
import { Avatar, AvatarEmpty } from "@/components/ui/Avatar";
import { TagPill } from "./pickers";
import { formatDue, isOverdue } from "@/lib/dates";
import { toggleComplete } from "@/actions/task";

export type SimpleTask = {
  id: string;
  title: string;
  completed: boolean;
  dueAt: string | null;
  dueHasTime: boolean;
  parentTitle: string | null;
  assignee: { id: string; name: string; avatarColor: string } | null;
  tags: { id: string; name: string; color: string }[];
  projects: { id: string; name: string; color: string }[];
};

/**
 * Linha de tarefa usada fora das visões de projeto (Minhas tarefas, Busca, Home).
 * Subtarefa mostra o breadcrumb "SUBTAREFA ‹ TAREFA PAI" (CA da seção 5.4).
 */
export function SimpleTaskList({ tasks }: { tasks: SimpleTask[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [, start] = useTransition();

  function open(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("task", id);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  if (tasks.length === 0) {
    return <p className="px-1 py-3 text-[12px] text-faint">Nada por aqui.</p>;
  }

  return (
    <div className="card divide-y divide-line overflow-hidden">
      {tasks.map((t) => {
        const completed = optimistic[t.id] ?? t.completed;
        const due = t.dueAt ? new Date(t.dueAt) : null;
        return (
          <div
            key={t.id}
            onClick={() => open(t.id)}
            className="flex cursor-pointer items-center gap-2.5 px-3.5 py-2 transition hover:bg-surface"
          >
            <CheckCircle
              completed={completed}
              onToggle={() => {
                const next = !completed;
                setOptimistic((p) => ({ ...p, [t.id]: next }));
                start(async () => {
                  await toggleComplete(t.id, next);
                  router.refresh();
                });
              }}
            />

            <div className="min-w-0 flex-1">
              <div
                className={`truncate text-[13px] ${
                  completed ? "text-faint line-through" : "text-text"
                }`}
              >
                {t.title}
              </div>
              {t.parentTitle && (
                <div className="flex items-center gap-1 truncate text-[10.5px] text-faint">
                  <ChevronRight className="h-2.5 w-2.5 rotate-180" />
                  {t.parentTitle}
                </div>
              )}
            </div>

            <div className="hidden shrink-0 gap-1 sm:flex">
              {t.tags.slice(0, 2).map((tag) => (
                <TagPill key={tag.id} tag={tag} size="sm" />
              ))}
            </div>

            <div className="hidden w-40 shrink-0 gap-1.5 md:flex">
              {t.projects.slice(0, 2).map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 truncate text-[10.5px] text-faint"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.name}
                </span>
              ))}
            </div>

            <span
              className={`w-28 shrink-0 text-right text-[11.5px] ${
                isOverdue(due, completed) ? "text-brand" : "text-muted"
              }`}
            >
              {due ? formatDue(due, t.dueHasTime) : ""}
            </span>

            {t.assignee ? (
              <Avatar name={t.assignee.name} color={t.assignee.avatarColor} size="sm" />
            ) : (
              <AvatarEmpty size="sm" />
            )}
          </div>
        );
      })}
    </div>
  );
}
