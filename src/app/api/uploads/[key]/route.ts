import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertTaskAccess } from "@/lib/permissions";
import { readAttachment, isBlobKey } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { key: raw } = await params;
  const key = decodeURIComponent(raw);

  // A chave é gerada por nós (uuid, ou "blob:" + pathname). Nunca confie no
  // path da URL: barra e ".." abririam caminho para ler fora do diretório.
  const suffix = isBlobKey(key) ? key.slice(5) : key;
  if (suffix.includes("/") || suffix.includes("\\") || suffix.includes("..")) {
    return NextResponse.json({ error: "chave inválida" }, { status: 400 });
  }

  const attachment = await db.attachment.findFirst({ where: { storageKey: key } });
  if (!attachment) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    await assertTaskAccess(user, attachment.taskId, false);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // O store do Blob é privado: o conteúdo é lido no servidor com o token e
  // transmitido daqui, em vez de redirecionar para uma URL pública.
  const file = await readAttachment(key);
  if (!file) return NextResponse.json({ error: "arquivo indisponível" }, { status: 410 });

  return new NextResponse(file.body as BodyInit, {
    headers: {
      "Content-Type": file.contentType ?? attachment.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.fileName)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
