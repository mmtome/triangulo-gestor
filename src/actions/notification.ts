"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { refreshAll } from "@/lib/revalidate";

export async function markRead(ids: string[]) {
  const user = await requireUser();
  await db.notification.updateMany({
    where: { id: { in: ids }, userId: user.id },
    data: { read: true },
  });
  refreshAll();
  return { ok: true };
}

export async function markAllRead() {
  const user = await requireUser();
  await db.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  refreshAll();
  return { ok: true };
}
