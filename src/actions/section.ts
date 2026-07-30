"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertProjectAccess } from "@/lib/permissions";
import { between } from "@/lib/ordering";
import { refreshAll } from "@/lib/revalidate";

export async function createSection(projectId: string, name: string) {
  const user = await requireUser();
  await assertProjectAccess(user, projectId, true);
  const parsed = z.string().trim().min(1, "Dê um nome à seção.").max(80).parse(name);

  const last = await db.section.findFirst({
    where: { projectId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const section = await db.section.create({
    data: { projectId, name: parsed, order: between(last?.order ?? null, null) },
  });

  refreshAll();
  return { id: section.id };
}

export async function renameSection(sectionId: string, name: string) {
  const user = await requireUser();
  const section = await db.section.findUniqueOrThrow({ where: { id: sectionId } });
  await assertProjectAccess(user, section.projectId, true);

  await db.section.update({
    where: { id: sectionId },
    data: { name: z.string().trim().min(1).max(80).parse(name) },
  });

  refreshAll();
  return { ok: true };
}

export async function moveSection(input: {
  sectionId: string;
  beforeSectionId?: string | null;
  afterSectionId?: string | null;
}) {
  const user = await requireUser();
  const section = await db.section.findUniqueOrThrow({ where: { id: input.sectionId } });
  await assertProjectAccess(user, section.projectId, true);

  const ids = [input.beforeSectionId, input.afterSectionId].filter((v): v is string => !!v);
  const neighbours = await db.section.findMany({
    where: { id: { in: ids } },
    select: { id: true, order: true },
  });

  const prev = neighbours.find((n) => n.id === input.beforeSectionId)?.order ?? null;
  const next = neighbours.find((n) => n.id === input.afterSectionId)?.order ?? null;

  await db.section.update({
    where: { id: input.sectionId },
    data: { order: between(prev, next) },
  });

  refreshAll();
  return { ok: true };
}

/** Seção 7.4: ao excluir, ou move as tarefas para outra seção ou as exclui. */
export async function deleteSection(sectionId: string, moveTasksToSectionId?: string | null) {
  const user = await requireUser();
  const section = await db.section.findUniqueOrThrow({ where: { id: sectionId } });
  await assertProjectAccess(user, section.projectId, true);

  if (moveTasksToSectionId) {
    await db.taskProject.updateMany({
      where: { sectionId },
      data: { sectionId: moveTasksToSectionId },
    });
  } else {
    const links = await db.taskProject.findMany({
      where: { sectionId },
      select: { taskId: true },
    });
    if (links.length) {
      await db.task.deleteMany({ where: { id: { in: links.map((l) => l.taskId) } } });
    }
  }

  await db.section.delete({ where: { id: sectionId } });
  refreshAll();
  return { ok: true };
}
