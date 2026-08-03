import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readAttachment } from "@/lib/storage";
import { assinaturaConfere } from "@/lib/publicador";

/* ============================================================================
   Arte de um post, servida SEM sessão — para a Meta conseguir buscá-la.

   Publicar no Instagram é por URL: a API não aceita upload, ela vai buscar a
   imagem. Como o store do Blob é privado e /api/uploads exige login, precisa
   existir esta porta. Ela é estreita de propósito, com três travas:

     1. assinatura HMAC do id do anexo na querystring;
     2. a tarefa precisa estar aprovada para publicar;
     3. só serve imagem.

   Desmarcar a aprovação fecha a porta na hora.

   A conversão para JPEG não é capricho: a API da Meta recusa PNG.
   ========================================================================== */

export async function GET(
  req: Request,
  { params }: { params: Promise<{ anexo: string }> },
) {
  const { anexo: anexoId } = await params;
  const assinatura = new URL(req.url).searchParams.get("a") ?? "";

  if (!assinaturaConfere(anexoId, assinatura)) {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 403 });
  }

  const anexo = await db.attachment.findUnique({
    where: { id: anexoId },
    include: { task: { select: { aprovadoParaPublicar: true } } },
  });

  if (!anexo || !anexo.isImage) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!anexo.task.aprovadoParaPublicar) {
    return NextResponse.json({ error: "tarefa não aprovada" }, { status: 403 });
  }

  const arquivo = await readAttachment(anexo.storageKey);
  if (!arquivo) {
    return NextResponse.json({ error: "arquivo indisponível" }, { status: 410 });
  }

  const bytes =
    arquivo.body instanceof Uint8Array
      ? Buffer.from(arquivo.body)
      : Buffer.from(new Uint8Array(await new Response(arquivo.body as ReadableStream).arrayBuffer()));

  const sharp = (await import("sharp")).default;
  const jpeg = await sharp(bytes).flatten({ background: "#0E0E10" }).jpeg({ quality: 92 }).toBuffer();

  return new NextResponse(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(jpeg.length),
      /* Sem cache, e isso é a trava principal: com "public, max-age", o CDN
         continuava servindo a imagem depois de a aprovação ser desmarcada — a
         porta não fechava. A Meta busca a imagem uma vez por publicação, então
         cache aqui não economiza nada e custa a revogação. */
      "Cache-Control": "no-store, private",
    },
  });
}
