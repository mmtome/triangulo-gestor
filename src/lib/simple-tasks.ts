import "server-only";
import { db } from "./db";
import type { SimpleTask } from "@/components/task/SimpleTaskList";
import type { Prisma } from "@prisma/client";

const include = {
  assignee: { select: { id: true, name: true, avatarColor: true } },
  parent: { select: { title: true } },
  tags: { include: { tag: true } },
  projects: { include: { project: { select: { id: true, name: true, color: true } } } },
} satisfies Prisma.TaskInclude;

type Row = Prisma.TaskGetPayload<{ include: typeof include }>;

export const TASK_INCLUDE = include;

export function toSimpleTask(t: Row): SimpleTask {
  return {
    id: t.id,
    title: t.title,
    completed: t.completed,
    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
    dueHasTime: t.dueHasTime,
    parentTitle: t.parent?.title ?? null,
    assignee: t.assignee,
    tags: t.tags.map((x) => x.tag),
    projects: t.projects.map((p) => p.project),
  };
}

/** Tarefas e subtarefas onde o usuário é responsável. */
export async function myTasks(userId: string, includeCompleted: boolean): Promise<SimpleTask[]> {
  const rows = await db.task.findMany({
    where: { assigneeId: userId, ...(includeCompleted ? {} : { completed: false }) },
    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
    include,
  });
  return rows.map(toSimpleTask);
}
