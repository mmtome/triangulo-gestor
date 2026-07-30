import "server-only";
import { db } from "./db";
import type { ActivityMeta } from "./activity-format";
import type { NotificationType } from "./enums";

/**
 * Log de atividade como side-effect das actions (seção 3.3.5 da spec) — nunca
 * por trigger de banco, para manter o texto legível.
 */
export async function logActivity(
  taskId: string,
  actorId: string,
  type: string,
  meta?: ActivityMeta,
) {
  await db.activityLog.create({
    data: { taskId, actorId, type, meta: meta ? JSON.stringify(meta) : null },
  });
}

/**
 * Matriz de geração de notificações (seção 7.7). Nunca notifica o próprio autor.
 */
export async function notify(params: {
  userIds: (string | null | undefined)[];
  actorId: string;
  type: NotificationType;
  taskId?: string;
}) {
  const targets = Array.from(
    new Set(params.userIds.filter((id): id is string => !!id && id !== params.actorId)),
  );
  if (targets.length === 0) return;

  await db.notification.createMany({
    data: targets.map((userId) => ({
      userId,
      actorId: params.actorId,
      type: params.type,
      taskId: params.taskId ?? null,
    })),
  });
}

/** Quem "segue" a tarefa: criador, responsável e colaboradores. */
export async function taskFollowers(taskId: string): Promise<string[]> {
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: {
      creatorId: true,
      assigneeId: true,
      collaborators: { select: { userId: true } },
    },
  });
  if (!task) return [];
  return [
    task.creatorId,
    task.assigneeId ?? undefined,
    ...task.collaborators.map((c) => c.userId),
  ].filter((v): v is string => !!v);
}
