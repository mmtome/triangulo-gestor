import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertTaskAccess } from "@/lib/permissions";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { key } = await params;

  // O nome do arquivo vem de randomUUID, mas nunca confie no path da URL.
  if (key.includes("/") || key.includes("\\") || key.includes("..")) {
    return NextResponse.json({ error: "chave inválida" }, { status: 400 });
  }

  const attachment = await db.attachment.findFirst({ where: { storageKey: key } });
  if (!attachment) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    await assertTaskAccess(user, attachment.taskId, false);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const buf = await readFile(path.join(UPLOAD_DIR, key));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.fileName)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "arquivo removido do disco" }, { status: 410 });
  }
}
