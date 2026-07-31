/**
 * Sobe os documentos de referência do ciclo para dentro do Gestor.
 *
 * Cria (ou reaproveita) uma tarefa-âncora no projeto do Instagram e anexa nela
 * os PDFs de planejamento e de marca, para o time abrir a fonte sem sair do app.
 *
 * Idempotente: rodar de novo substitui os anexos em vez de duplicar.
 *
 * Rodar:  npm run docs:anexar
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { between } from "../src/lib/ordering";

const db = new PrismaClient();

/**
 * Mesma regra do src/lib/storage.ts, reimplementada aqui porque aquele módulo é
 * "server-only" e não carrega fora do Next. Se a regra mudar lá, mude aqui.
 */
async function putFile(fileName: string, bytes: Buffer, contentType: string): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(fileName, bytes, {
      access: "private",
      contentType,
      addRandomSuffix: true,
    });
    return `blob:${blob.pathname}`;
  }
  const dir = join(process.cwd(), "uploads");
  mkdirSync(dir, { recursive: true });
  const key = `${randomUUID()}.pdf`;
  writeFileSync(join(dir, key), bytes);
  return key;
}

/** Carrega .env.local e .env — o token do Blob não vem pelo Prisma. */
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
  }
}

const DOCS = [
  {
    path: "d:/TS/BRANDING/PLANEJAMENTO DE CONTEUDO INSTAGRAM.pdf",
    rotulo: "o plano editorial do ciclo 1",
  },
  {
    path: "d:/TS/BRANDING/BRANDING E POSICIONAMENTO.pdf",
    rotulo: "posicionamento, Primal Branding e linha editorial",
  },
  {
    path: "d:/TS/BRANDING/assets/Manual da Marca.pdf",
    rotulo: "cores, tipografia e uso do símbolo",
  },
];

const TITULO = "📎 Documentos do ciclo — planejamento, branding e manual da marca";

async function main() {
  loadEnv();

  const project = await db.project.findFirst({
    where: { name: { startsWith: "Instagram" } },
    include: { sections: { orderBy: { order: "asc" } } },
  });
  if (!project) throw new Error("Projeto do Instagram não encontrado. Rode o seed antes.");

  const admin = await db.user.findFirstOrThrow({ where: { role: "ADMIN" } });
  const secao = project.sections.find((s) => s.name === "Banco de pautas") ?? project.sections[0];

  // Tarefa-âncora: reaproveita se já existir.
  let task = await db.task.findFirst({ where: { title: TITULO } });
  if (!task) {
    const last = await db.taskProject.findFirst({
      where: { projectId: project.id, sectionId: secao.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    task = await db.task.create({
      data: {
        title: TITULO,
        creatorId: admin.id,
        description: `Fonte da verdade do ciclo, anexada aqui para não depender de pasta compartilhada.

- **Planejamento de Conteúdo · Instagram** — a grade, os 4 tipos, o calendário e o banco de pautas
- **Branding e Posicionamento** — a grande ideia, o Primal Branding e a linha editorial
- **Manual da Marca** — vermelho #CE2B34, preto #0E0E10, Poppins e o uso do símbolo

Quando o planejamento mudar, rode \`npm run docs:anexar\` para substituir os
arquivos — a tarefa continua a mesma.`,
        projects: {
          create: {
            projectId: project.id,
            sectionId: secao.id,
            order: between(last?.order ?? null, null),
          },
        },
      },
    });
    await db.activityLog.create({
      data: { taskId: task.id, actorId: admin.id, type: "created" },
    });
    console.log("Tarefa-âncora criada.");
  } else {
    console.log("Tarefa-âncora já existia — substituindo anexos.");
    await db.attachment.deleteMany({ where: { taskId: task.id } });
  }

  for (const doc of DOCS) {
    if (!existsSync(doc.path)) {
      console.log(`  ! não encontrado, pulando: ${doc.path}`);
      continue;
    }
    const bytes = readFileSync(doc.path);
    const nome = basename(doc.path);
    const storageKey = await putFile(nome, bytes, "application/pdf");

    await db.attachment.create({
      data: {
        taskId: task.id,
        fileName: nome,
        mimeType: "application/pdf",
        sizeBytes: bytes.length,
        storageKey,
        isImage: false,
      },
    });
    await db.activityLog.create({
      data: {
        taskId: task.id,
        actorId: admin.id,
        type: "attachment_added",
        meta: { title: nome },
      },
    });
    console.log(`  + ${nome} (${Math.round(bytes.length / 1024)} KB) — ${doc.rotulo}`);
  }

  const total = await db.attachment.count({ where: { taskId: task.id } });
  console.log(`\nPronto: ${total} anexos em "${TITULO}"`);
  console.log(`Backend: ${process.env.BLOB_READ_WRITE_TOKEN ? "Vercel Blob (privado)" : "disco local"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
