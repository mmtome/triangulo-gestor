import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertTaskAccess } from "@/lib/permissions";
import { getLocalFile, isRemoteKey } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { key } = await params;

  // A chave vem de randomUUID, mas nunca confie no path da URL.
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

  // Anexo no Vercel Blob: a própria storageKey já é a URL pública.
  if (isRemoteKey(attachment.storageKey)) {
    return NextResponse.redirect(attachment.storageKey);
  }

  try {
    const buf = await getLocalFile(key);
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
