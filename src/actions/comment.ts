"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertTaskAccess } from "@/lib/permissions";
import { notify, taskFollowers } from "@/lib/activity";
import { refreshAll } from "@/lib/revalidate";

/** Extrai @menções do corpo: <span data-user-id="..."> ou @nome simples. */
async function extractMentions(body: string): Promise<string[]> {
  const ids = Array.from(body.matchAll(/data-user-id="([^"]+)"/g)).map((m) => m[1]);
  if (ids.length) return ids;

  const names = Array.from(body.matchAll(/@([\wÀ-ÿ.]+)/g)).map((m) => m[1].toLowerCase());
  if (!names.length) return [];

  const users = await db.user.findMany({ select: { id: true, name: true, email: true } });
  return users
    .filter((u) => {
      const first = u.name.split(/\s+/)[0].toLowerCase();
      const handle = u.email.split("@")[0].toLowerCase();
      return names.includes(first) || names.includes(handle);
    })
    .map((u) => u.id);
}

export async function addComment(taskId: string, body: string) {
  const user = await requireUser();
  await assertTaskAccess(user, taskId, true);

  const text = z.string().trim().min(1, "Escreva algo antes de enviar.").parse(body);

  await db.comment.create({ data: { taskId, authorId: user.id, body: text } });

  await notify({
    userIds: await taskFollowers(taskId),
    actorId: user.id,
    type: "COMMENT_ADDED",
    taskId,
  });

  const mentioned = await extractMentions(text);
  if (mentioned.length) {
    await notify({ userIds: mentioned, actorId: user.id, type: "MENTIONED", taskId });
  }

  refreshAll();
  return { ok: true };
}

export async function editComment(commentId: string, body: string) {
  const user = await requireUser();
  const comment = await db.comment.findUniqueOrThrow({ where: { id: commentId } });
  if (comment.authorId !== user.id && user.role !== "ADMIN") {
    throw new Error("Você só pode editar os seus comentários.");
  }

  await db.comment.update({
    where: { id: commentId },
    data: { body: z.string().trim().min(1).parse(body), editedAt: new Date() },
  });

  refreshAll();
  return { ok: true };
}

export async function deleteComment(commentId: string) {
  const user = await requireUser();
  const comment = await db.comment.findUniqueOrThrow({ where: { id: commentId } });
  if (comment.authorId !== user.id && user.role !== "ADMIN") {
    throw new Error("Você só pode excluir os seus comentários.");
  }
  await db.comment.delete({ where: { id: commentId } });
  refreshAll();
  return { ok: true };
}
