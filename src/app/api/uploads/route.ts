import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertTaskAccess } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB (seção 6 da spec)
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const taskId = String(form.get("taskId") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "arquivo ausente" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "arquivo acima de 25 MB" }, { status: 413 });
  }

  try {
    await assertTaskAccess(user, taskId, true);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const ext = path.extname(file.name).slice(0, 12);
  const storageKey = `${randomUUID()}${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(
    path.join(UPLOAD_DIR, storageKey),
    Buffer.from(await file.arrayBuffer()),
  );

  const attachment = await db.attachment.create({
    data: {
      taskId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      storageKey,
      isImage: (file.type || "").startsWith("image/"),
    },
  });

  await logActivity(taskId, user.id, "attachment_added", { title: file.name });

  return NextResponse.json({ attachment });
}
