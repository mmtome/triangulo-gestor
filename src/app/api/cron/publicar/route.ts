import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publicarTarefa, credencialConfigurada } from "@/lib/publicador";

/* ============================================================================
   Cron de publicação.

   Varre as tarefas aprovadas cuja data já chegou e ainda não foram publicadas,
   e manda cada uma para o Instagram. É o único gatilho automático do sistema.

   Roda uma vez por dia (ver vercel.json) porque o plano Hobby da Vercel não
   permite frequência maior. Consequência prática: o post sai no horário do
   cron, não no horário exato da tarefa. Para publicar na hora marcada seria
   preciso um plano com cron de hora em hora.

   A varredura pega `dueAt <= agora`, então um post aprovado com atraso sai na
   próxima passagem em vez de ser perdido.
   ========================================================================== */

export const maxDuration = 300;

function autorizado(req: Request): boolean {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return true; // sem segredo configurado, só a própria Vercel chama
  const header = req.headers.get("authorization");
  return header === `Bearer ${segredo}`;
}

export async function GET(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const agora = new Date();
  const pendentes = await db.task.findMany({
    where: {
      aprovadoParaPublicar: true,
      publicadoEm: null,
      dueAt: { lte: agora },
    },
    orderBy: { dueAt: "asc" },
    select: { id: true, title: true },
    // Trava de segurança: se algo estiver errado, o estrago é limitado.
    take: 5,
  });

  const resultados = [];

  for (const tarefa of pendentes) {
    const r = await publicarTarefa(tarefa.id);

    await db.task.update({
      where: { id: tarefa.id },
      data: {
        publicacaoStatus: r.status,
        publicacaoErro: r.erro ?? null,
        // Só marca como publicado de verdade quando a Meta confirmou.
        publicadoEm: r.status === "publicado" ? new Date() : null,
        instagramMediaId: r.mediaId ?? null,
        instagramPermalink: r.permalink ?? null,
        // Publicou: a tarefa está concluída de fato.
        ...(r.status === "publicado" ? { completed: true, completedAt: new Date() } : {}),
      },
    });

    resultados.push({ id: tarefa.id, titulo: tarefa.title, status: r.status, erro: r.erro });
  }

  return NextResponse.json({
    executadoEm: agora.toISOString(),
    credencial: credencialConfigurada() ? "ok" : "ausente",
    processados: resultados.length,
    resultados,
  });
}
