"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertProjectAccess, assertTaskAccess } from "@/lib/permissions";
import { logActivity, notify, taskFollowers } from "@/lib/activity";
import { between } from "@/lib/ordering";
import { formatDuration } from "@/lib/dates";
import { refreshAll } from "@/lib/revalidate";

/* -------------------------------------------------------------------------- */
/* helpers                                                                     */
/* -------------------------------------------------------------------------- */

// Datas trafegam como ISO string. "" e null limpam o campo.
const isoDate = z.string().nullable().optional();

function toDate(v: string | null | undefined): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Última chave de ordem de uma seção — para acrescentar no fim. */
async function lastOrderInSection(projectId: string, sectionId: string | null) {
  const last = await db.taskProject.findFirst({
    where: { projectId, sectionId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return last?.order ?? null;
}

/* -------------------------------------------------------------------------- */
/* createTask                                                                  */
/* -------------------------------------------------------------------------- */

const createSchema = z.object({
  title: z.string().trim().min(1, "O título é obrigatório.").max(500),
  projectId: z.string().optional().nullable(),
  sectionId: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  dueAt: isoDate,
  dueHasTime: z.boolean().optional(),
  parentTaskId: z.string().optional().nullable(),
});

export async function createTask(input: z.infer<typeof createSchema>) {
  const user = await requireUser();
  const data = createSchema.parse(input);

  if (data.projectId) await assertProjectAccess(user, data.projectId, true);
  if (data.parentTaskId) await assertTaskAccess(user, data.parentTaskId, true);

  let subtaskOrder: string | null = null;
  if (data.parentTaskId) {
    const last = await db.task.findFirst({
      where: { parentTaskId: data.parentTaskId },
      orderBy: { subtaskOrder: "desc" },
      select: { subtaskOrder: true },
    });
    subtaskOrder = between(last?.subtaskOrder ?? null, null);
  }

  const task = await db.task.create({
    data: {
      title: data.title,
      creatorId: user.id,
      assigneeId: data.assigneeId || null,
      dueAt: toDate(data.dueAt) ?? null,
      dueHasTime: data.dueHasTime ?? false,
      parentTaskId: data.parentTaskId || null,
      subtaskOrder,
    },
  });

  // Subtarefas herdam o contexto do pai — não entram em projeto diretamente
  // (seção 3.3.3 da spec).
  if (data.projectId && !data.parentTaskId) {
    const last = await lastOrderInSection(data.projectId, data.sectionId || null);
    await db.taskProject.create({
      data: {
        taskId: task.id,
        projectId: data.projectId,
        sectionId: data.sectionId || null,
        order: between(last, null),
      },
    });
  }

  await logActivity(task.id, user.id, "created");
  if (data.parentTaskId) {
    await logActivity(data.parentTaskId, user.id, "subtask_added", { title: task.title });
  }
  if (task.assigneeId) {
    await notify({
      userIds: [task.assigneeId],
      actorId: user.id,
      type: "TASK_ASSIGNED",
      taskId: task.id,
    });
  }

  refreshAll();
  return { id: task.id };
}

/* -------------------------------------------------------------------------- */
/* updateTask                                                                  */
/* -------------------------------------------------------------------------- */

const updateSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  dueAt: isoDate,
  dueHasTime: z.boolean().optional(),
  startAt: isoDate,
  estimatedMinutes: z.number().int().min(0).nullable().optional(),
  completed: z.boolean().optional(),
});

export async function updateTask(taskId: string, patch: z.infer<typeof updateSchema>) {
  const user = await requireUser();
  await assertTaskAccess(user, taskId, true);
  const data = updateSchema.parse(patch);

  const before = await db.task.findUniqueOrThrow({ where: { id: taskId } });

  const next: Record<string, unknown> = {};
  if (data.title !== undefined) next.title = data.title;
  if (data.description !== undefined) next.description = data.description;
  if (data.assigneeId !== undefined) next.assigneeId = data.assigneeId || null;
  if (data.dueAt !== undefined) next.dueAt = toDate(data.dueAt);
  if (data.dueHasTime !== undefined) next.dueHasTime = data.dueHasTime;
  if (data.startAt !== undefined) next.startAt = toDate(data.startAt);
  if (data.estimatedMinutes !== undefined) next.estimatedMinutes = data.estimatedMinutes;
  if (data.completed !== undefined) {
    next.completed = data.completed;
    next.completedAt = data.completed ? new Date() : null;
  }

  const task = await db.task.update({ where: { id: taskId }, data: next });

  /* ---- log de atividade + notificações (seções 3.3.5 e 7.7) --------------- */

  if (data.title !== undefined && data.title !== before.title) {
    await logActivity(taskId, user.id, "title_changed", { from: before.title, to: data.title });
  }

  if (data.description !== undefined && data.description !== before.description) {
    await logActivity(taskId, user.id, "description_changed");
  }

  if (data.assigneeId !== undefined && (data.assigneeId || null) !== before.assigneeId) {
    const assignee = task.assigneeId
      ? await db.user.findUnique({ where: { id: task.assigneeId }, select: { name: true } })
      : null;
    await logActivity(taskId, user.id, "assigned", { assigneeName: assignee?.name });
    if (task.assigneeId) {
      await notify({
        userIds: [task.assigneeId],
        actorId: user.id,
        type: "TASK_ASSIGNED",
        taskId,
      });
    }
  }

  if (data.dueAt !== undefined) {
    const nextDue = toDate(data.dueAt);
    const changed = (nextDue?.getTime() ?? null) !== (before.dueAt?.getTime() ?? null);
    if (changed) {
      if (nextDue) {
        await logActivity(taskId, user.id, "due_changed", {
          from: before.dueAt?.toISOString() ?? null,
          to: nextDue.toISOString(),
          toHasTime: data.dueHasTime ?? task.dueHasTime,
        });
      } else {
        await logActivity(taskId, user.id, "due_cleared");
      }
      await notify({
        userIds: await taskFollowers(taskId),
        actorId: user.id,
        type: "DUE_DATE_CHANGED",
        taskId,
      });
    }
  }

  if (data.estimatedMinutes !== undefined && data.estimatedMinutes !== before.estimatedMinutes) {
    await logActivity(taskId, user.id, "estimate_changed", {
      to: data.estimatedMinutes ? formatDuration(data.estimatedMinutes) : null,
    });
  }

  if (data.completed !== undefined && data.completed !== before.completed) {
    await logActivity(taskId, user.id, data.completed ? "completed" : "reopened");
    if (data.completed) {
      await notify({
        userIds: [before.creatorId],
        actorId: user.id,
        type: "TASK_COMPLETED",
        taskId,
      });
    }
  }

  refreshAll();
  return { ok: true };
}

/** Atalho usado pelo check circular das visões (com optimistic UI no cliente). */
export async function toggleComplete(taskId: string, completed: boolean) {
  return updateTask(taskId, { completed });
}

/* -------------------------------------------------------------------------- */
/* moveTask — kanban e reordenação da lista                                    */
/* -------------------------------------------------------------------------- */

export async function moveTask(input: {
  taskId: string;
  projectId: string;
  toSectionId: string | null;
  beforeTaskId?: string | null; // tarefa que ficará ACIMA da movida
  afterTaskId?: string | null; // tarefa que ficará ABAIXO da movida
}) {
  const user = await requireUser();
  await assertProjectAccess(user, input.projectId, true);
  await assertTaskAccess(user, input.taskId, true);

  const neighbours = await db.taskProject.findMany({
    where: {
      projectId: input.projectId,
      taskId: { in: [input.beforeTaskId, input.afterTaskId].filter((v): v is string => !!v) },
    },
    select: { taskId: true, order: true },
  });

  const prev = neighbours.find((n) => n.taskId === input.beforeTaskId)?.order ?? null;
  const nextO = neighbours.find((n) => n.taskId === input.afterTaskId)?.order ?? null;

  const order =
    prev || nextO
      ? between(prev, nextO)
      : between(await lastOrderInSection(input.projectId, input.toSectionId), null);

  const existing = await db.taskProject.findUnique({
    where: { taskId_projectId: { taskId: input.taskId, projectId: input.projectId } },
  });

  const movedSection = existing && existing.sectionId !== input.toSectionId;

  await db.taskProject.upsert({
    where: { taskId_projectId: { taskId: input.taskId, projectId: input.projectId } },
    create: {
      taskId: input.taskId,
      projectId: input.projectId,
      sectionId: input.toSectionId,
      order,
    },
    update: { sectionId: input.toSectionId, order },
  });

  if (movedSection) {
    const section = input.toSectionId
      ? await db.section.findUnique({
          where: { id: input.toSectionId },
          select: { name: true },
        })
      : null;
    await logActivity(input.taskId, user.id, "moved", { sectionName: section?.name });
  }

  refreshAll();
  return { ok: true };
}

/** Reordena uma subtarefa dentro do pai. */
export async function moveSubtask(input: {
  taskId: string;
  beforeTaskId?: string | null;
  afterTaskId?: string | null;
}) {
  const user = await requireUser();
  await assertTaskAccess(user, input.taskId, true);

  const ids = [input.beforeTaskId, input.afterTaskId].filter((v): v is string => !!v);
  const neighbours = await db.task.findMany({
    where: { id: { in: ids } },
    select: { id: true, subtaskOrder: true },
  });
  const prev = neighbours.find((n) => n.id === input.beforeTaskId)?.subtaskOrder ?? null;
  const nextO = neighbours.find((n) => n.id === input.afterTaskId)?.subtaskOrder ?? null;

  await db.task.update({
    where: { id: input.taskId },
    data: { subtaskOrder: between(prev, nextO) },
  });

  refreshAll();
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* multi-homing (seção 3.3.2)                                                  */
/* -------------------------------------------------------------------------- */

export async function addTaskToProject(input: {
  taskId: string;
  projectId: string;
  sectionId?: string | null;
}) {
  const user = await requireUser();
  await assertProjectAccess(user, input.projectId, true);
  await assertTaskAccess(user, input.taskId, true);

  const exists = await db.taskProject.findUnique({
    where: { taskId_projectId: { taskId: input.taskId, projectId: input.projectId } },
  });
  if (exists) return { ok: true };

  const last = await lastOrderInSection(input.projectId, input.sectionId ?? null);
  await db.taskProject.create({
    data: {
      taskId: input.taskId,
      projectId: input.projectId,
      sectionId: input.sectionId ?? null,
      order: between(last, null),
    },
  });

  const project = await db.project.findUnique({
    where: { id: input.projectId },
    select: { name: true },
  });
  await logActivity(input.taskId, user.id, "project_added", { projectName: project?.name });

  refreshAll();
  return { ok: true };
}

export async function removeTaskFromProject(taskId: string, projectId: string) {
  const user = await requireUser();
  await assertProjectAccess(user, projectId, true);

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { name: true },
  });
  await db.taskProject.delete({ where: { taskId_projectId: { taskId, projectId } } });
  await logActivity(taskId, user.id, "project_removed", { projectName: project?.name });

  refreshAll();
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* tags, dependências, exclusão                                                */
/* -------------------------------------------------------------------------- */

export async function setTags(taskId: string, tagIds: string[]) {
  const user = await requireUser();
  await assertTaskAccess(user, taskId, true);

  const current = await db.taskTag.findMany({
    where: { taskId },
    include: { tag: { select: { id: true, name: true } } },
  });
  const currentIds = current.map((t) => t.tagId);

  const added = tagIds.filter((id) => !currentIds.includes(id));
  const removed = current.filter((t) => !tagIds.includes(t.tagId));

  await db.taskTag.deleteMany({ where: { taskId } });
  if (tagIds.length) {
    await db.taskTag.createMany({ data: tagIds.map((tagId) => ({ taskId, tagId })) });
  }

  for (const tagId of added) {
    const tag = await db.tag.findUnique({ where: { id: tagId }, select: { name: true } });
    await logActivity(taskId, user.id, "tag_added", { tagName: tag?.name });
  }
  for (const t of removed) {
    await logActivity(taskId, user.id, "tag_removed", { tagName: t.tag.name });
  }

  refreshAll();
  return { ok: true };
}

export async function addDependency(blockedId: string, blockingId: string) {
  const user = await requireUser();
  await assertTaskAccess(user, blockedId, true);
  if (blockedId === blockingId) throw new Error("Uma tarefa não pode bloquear a si mesma.");

  await db.taskDependency.upsert({
    where: { blockedId_blockingId: { blockedId, blockingId } },
    create: { blockedId, blockingId },
    update: {},
  });

  const blocking = await db.task.findUnique({
    where: { id: blockingId },
    select: { title: true },
  });
  await logActivity(blockedId, user.id, "dependency_added", { title: blocking?.title });

  refreshAll();
  return { ok: true };
}

export async function removeDependency(blockedId: string, blockingId: string) {
  const user = await requireUser();
  await assertTaskAccess(user, blockedId, true);
  await db.taskDependency.delete({ where: { blockedId_blockingId: { blockedId, blockingId } } });
  await logActivity(blockedId, user.id, "dependency_removed");
  refreshAll();
  return { ok: true };
}

export async function deleteTask(taskId: string) {
  const user = await requireUser();
  await assertTaskAccess(user, taskId, true);
  await db.task.delete({ where: { id: taskId } }); // cascade nas subtarefas
  refreshAll();
  return { ok: true };
}

export async function toggleLike(taskId: string) {
  const user = await requireUser();
  await assertTaskAccess(user, taskId, false);
  const task = await db.task.findUniqueOrThrow({ where: { id: taskId } });
  await db.task.update({
    where: { id: taskId },
    data: { likes: task.likes > 0 ? task.likes - 1 : 1 },
  });
  refreshAll();
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Template do fluxo de produção (seção 5.14)                                  */
/* -------------------------------------------------------------------------- */

type TemplateItem = { title: string; offsetDays: number; defaultAssigneeEmail?: string };

export async function applySubtaskTemplate(taskId: string, templateId: string) {
  const user = await requireUser();
  await assertTaskAccess(user, taskId, true);

  const [task, template] = await Promise.all([
    db.task.findUniqueOrThrow({
      where: { id: taskId },
      include: { subtasks: { select: { id: true } } },
    }),
    db.subtaskTemplate.findUniqueOrThrow({ where: { id: templateId } }),
  ]);

  // Coluna Json no PostgreSQL; tolera string caso venha de um registro antigo.
  const items = (
    typeof template.items === "string" ? JSON.parse(template.items) : template.items
  ) as TemplateItem[];
  const base = task.dueAt ?? new Date();

  const emails = items.map((i) => i.defaultAssigneeEmail).filter((e): e is string => !!e);
  const users = emails.length
    ? await db.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } })
    : [];

  let order: string | null = null;
  for (const item of items) {
    const due = new Date(base);
    due.setDate(due.getDate() + item.offsetDays);
    order = between(order, null);

    await db.task.create({
      data: {
        title: item.title,
        creatorId: user.id,
        parentTaskId: taskId,
        subtaskOrder: order,
        dueAt: due,
        dueHasTime: task.dueHasTime,
        assigneeId: users.find((u) => u.email === item.defaultAssigneeEmail)?.id ?? null,
      },
    });
  }

  await logActivity(taskId, user.id, "template_applied");
  refreshAll();
  return { created: items.length };
}

/* -------------------------------------------------------------------------- */
/* Aprovação para publicação automática                                        */
/* -------------------------------------------------------------------------- */

/**
 * Marca (ou desmarca) a tarefa como aprovada para virar post.
 *
 * A partir daqui não há mais ação manual: o cron diário publica no dia da
 * `dueAt`. Desmarcar antes disso cancela — e também fecha o acesso público à
 * arte, porque /api/publico/arte confere esta mesma flag.
 */
export async function setAprovacaoPublicacao(taskId: string, aprovado: boolean) {
  const user = await requireUser();
  await assertTaskAccess(user, taskId, true);

  const antes = await db.task.findUniqueOrThrow({
    where: { id: taskId },
    select: { aprovadoParaPublicar: true, publicadoEm: true },
  });

  if (antes.publicadoEm) {
    return { ok: false, erro: "Este post já foi publicado." };
  }
  if (antes.aprovadoParaPublicar === aprovado) return { ok: true };

  await db.task.update({
    where: { id: taskId },
    data: {
      aprovadoParaPublicar: aprovado,
      aprovadoEm: aprovado ? new Date() : null,
      aprovadoPorId: aprovado ? user.id : null,
      // Reaprovar depois de um erro tem que dar nova chance ao cron.
      publicacaoStatus: aprovado ? null : null,
      publicacaoErro: null,
    },
  });

  await logActivity(
    taskId,
    user.id,
    aprovado ? "aprovado_para_publicar" : "aprovacao_removida",
  );
  await notify({
    userIds: await taskFollowers(taskId),
    actorId: user.id,
    type: "TASK_COMPLETED",
    taskId,
  });

  refreshAll();
  return { ok: true };
}

/** Legenda do post — é ela que vai como caption no Instagram. */
export async function setLegenda(taskId: string, legenda: string) {
  const user = await requireUser();
  await assertTaskAccess(user, taskId, true);
  await db.task.update({
    where: { id: taskId },
    data: { legenda: legenda.trim() ? legenda.slice(0, 2200) : null },
  });
  refreshAll();
  return { ok: true };
}
