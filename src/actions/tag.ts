"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertProjectAccess } from "@/lib/permissions";
import { PALETTE } from "@/lib/enums";
import { refreshAll } from "@/lib/revalidate";

export async function createTag(input: {
  name: string;
  color?: string;
  projectId?: string | null;
}) {
  const user = await requireUser();
  if (input.projectId) await assertProjectAccess(user, input.projectId, true);

  const name = z.string().trim().min(1, "Dê um nome à tag.").max(40).parse(input.name);
  const color = input.color ?? PALETTE[Math.floor(Math.random() * PALETTE.length)];

  const existing = await db.tag.findFirst({
    where: { name, projectId: input.projectId ?? null },
  });
  if (existing) return { id: existing.id };

  const tag = await db.tag.create({
    data: { name, color, projectId: input.projectId ?? null },
  });

  refreshAll();
  return { id: tag.id };
}

export async function updateTag(tagId: string, patch: { name?: string; color?: string }) {
  const user = await requireUser();
  const tag = await db.tag.findUniqueOrThrow({ where: { id: tagId } });
  if (tag.projectId) await assertProjectAccess(user, tag.projectId, true);

  await db.tag.update({
    where: { id: tagId },
    data: {
      ...(patch.name !== undefined
        ? { name: z.string().trim().min(1).max(40).parse(patch.name) }
        : {}),
      ...(patch.color !== undefined ? { color: patch.color } : {}),
    },
  });

  refreshAll();
  return { ok: true };
}

/** Seção 7.6: excluir a tag a remove das tarefas — a confirmação fica na UI. */
export async function deleteTag(tagId: string) {
  const user = await requireUser();
  const tag = await db.tag.findUniqueOrThrow({ where: { id: tagId } });
  if (tag.projectId) await assertProjectAccess(user, tag.projectId, true);
  await db.tag.delete({ where: { id: tagId } });
  refreshAll();
  return { ok: true };
}
