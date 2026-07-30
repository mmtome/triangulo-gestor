import "server-only";
import { db } from "./db";
import type { SessionUser } from "./auth";
import { assertProjectAccess } from "./permissions";
import { parseFilters, type ViewFilters } from "@/lib/view-filters";
import type { ViewType } from "./enums";

/** Formato consumido por todas as visões do projeto. */
export type ViewTask = {
  id: string;
  title: string;
  completed: boolean;
  dueAt: Date | null;
  dueHasTime: boolean;
  startAt: Date | null;
  estimatedMinutes: number | null;
  order: string;
  sectionId: string | null;
  assignee: { id: string; name: string; avatarColor: string } | null;
  tags: { id: string; name: string; color: string }[];
  counts: { subtasks: number; doneSubtasks: number; comments: number; attachments: number };
  coverKey: string | null;
  subtasks: {
    id: string;
    title: string;
    completed: boolean;
    dueAt: Date | null;
    dueHasTime: boolean;
    assignee: { id: string; name: string; avatarColor: string } | null;
  }[];
};

export async function getProjectHeader(user: SessionUser, projectId: string) {
  await assertProjectAccess(user, projectId, false);

  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } },
      },
    },
  });

  const favorite =
    project.members.find((m) => m.userId === user.id)?.favorite ?? false;

  return { project, favorite };
}

export async function getViewPref(user: SessionUser, projectId: string, viewType: ViewType) {
  const pref = await db.viewPreference.findUnique({
    where: { userId_projectId_viewType: { userId: user.id, projectId, viewType } },
  });
  return {
    filters: parseFilters(pref?.filters),
    sortBy: pref?.sortBy ?? "manual",
    groupBy: pref?.groupBy ?? "section",
  };
}

/** Tarefas do projeto já filtradas, com contadores e subtarefas. */
export async function getProjectTasks(
  projectId: string,
  filters: ViewFilters,
): Promise<{ sections: { id: string; name: string; order: string }[]; tasks: ViewTask[] }> {
  const sections = await db.section.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
    select: { id: true, name: true, order: true },
  });

  const links = await db.taskProject.findMany({
    where: {
      projectId,
      task: {
        ...(filters.incomplete ? { completed: false } : {}),
        ...(filters.assigneeIds?.length ? { assigneeId: { in: filters.assigneeIds } } : {}),
        ...(filters.tagIds?.length
          ? { tags: { some: { tagId: { in: filters.tagIds } } } }
          : {}),
      },
    },
    orderBy: { order: "asc" },
    include: {
      task: {
        include: {
          assignee: { select: { id: true, name: true, avatarColor: true } },
          tags: { include: { tag: true } },
          attachments: { select: { storageKey: true, isImage: true } },
          subtasks: {
            orderBy: [{ subtaskOrder: "asc" }, { createdAt: "asc" }],
            include: { assignee: { select: { id: true, name: true, avatarColor: true } } },
          },
          _count: { select: { comments: true, attachments: true, subtasks: true } },
        },
      },
    },
  });

  const tasks: ViewTask[] = links.map((l) => ({
    id: l.task.id,
    title: l.task.title,
    completed: l.task.completed,
    dueAt: l.task.dueAt,
    dueHasTime: l.task.dueHasTime,
    startAt: l.task.startAt,
    estimatedMinutes: l.task.estimatedMinutes,
    order: l.order,
    sectionId: l.sectionId,
    assignee: l.task.assignee,
    tags: l.task.tags.map((t) => t.tag),
    counts: {
      subtasks: l.task._count.subtasks,
      doneSubtasks: l.task.subtasks.filter((s) => s.completed).length,
      comments: l.task._count.comments,
      attachments: l.task._count.attachments,
    },
    coverKey: l.task.attachments.find((a) => a.isImage)?.storageKey ?? null,
    subtasks: l.task.subtasks.map((s) => ({
      id: s.id,
      title: s.title,
      completed: s.completed,
      dueAt: s.dueAt,
      dueHasTime: s.dueHasTime,
      assignee: s.assignee,
    })),
  }));

  return { sections, tasks };
}

export async function getProjectTags(projectId: string) {
  return db.tag.findMany({
    where: { OR: [{ projectId }, { projectId: null }] },
    orderBy: { name: "asc" },
  });
}
