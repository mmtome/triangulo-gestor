import type { ViewTask } from "./queries";

/** Datas viram ISO string antes de cruzar a fronteira servidor → cliente. */
export type SerializedTask = Omit<ViewTask, "dueAt" | "startAt" | "subtasks"> & {
  dueAt: string | null;
  startAt: string | null;
  subtasks: {
    id: string;
    title: string;
    completed: boolean;
    dueAt: string | null;
    dueHasTime: boolean;
    assignee: { id: string; name: string; avatarColor: string } | null;
  }[];
};

export function serializeTask(t: ViewTask): SerializedTask {
  return {
    ...t,
    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
    startAt: t.startAt ? t.startAt.toISOString() : null,
    subtasks: t.subtasks.map((s) => ({
      ...s,
      dueAt: s.dueAt ? s.dueAt.toISOString() : null,
    })),
  };
}

export const serializeTasks = (tasks: ViewTask[]): SerializedTask[] => tasks.map(serializeTask);
