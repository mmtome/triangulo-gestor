/**
 * Anexa a arte de um post à sua tarefa no Gestor.
 *
 * A imagem entra com isImage=true, então vira capa do card na visão Quadro —
 * o calendário editorial passa a mostrar a peça, não só o título.
 *
 * Uso:  npm run arte:anexar -- "<caminho do png>" "<trecho do título da tarefa>"
 * Ex.:  npm run arte:anexar -- "d:/TS/BRANDING/posts/01 ....png" "Sua empresa não tem"
 *
 * Idempotente por nome de arquivo: reanexar substitui a versão anterior.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join, extname } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
  }
}

/** Mesma regra do src/lib/storage.ts — aquele módulo é server-only. */
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
  const key = `${randomUUID()}${extname(fileName)}`;
  writeFileSync(join(dir, key), bytes);
  return key;
}

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

async function main() {
  loadEnv();

  const [caminho, trechoTitulo] = process.argv.slice(2);
  if (!caminho || !trechoTitulo) {
    throw new Error('Uso: npm run arte:anexar -- "<png>" "<trecho do título>"');
  }
  if (!existsSync(caminho)) throw new Error(`Arquivo não encontrado: ${caminho}`);

  const task = await db.task.findFirst({
    where: { title: { contains: trechoTitulo, mode: "insensitive" } },
    select: { id: true, title: true },
  });
  if (!task) throw new Error(`Nenhuma tarefa com "${trechoTitulo}" no título.`);

  const admin = await db.user.findFirstOrThrow({ where: { role: "ADMIN" } });
  const nome = basename(caminho);
  const ext = extname(caminho).toLowerCase();
  const mimeType = MIME[ext] ?? "application/octet-stream";
  const bytes = readFileSync(caminho);

  await db.attachment.deleteMany({ where: { taskId: task.id, fileName: nome } });

  const storageKey = await putFile(nome, bytes, mimeType);
  await db.attachment.create({
    data: {
      taskId: task.id,
      fileName: nome,
      mimeType,
      sizeBytes: bytes.length,
      storageKey,
      isImage: mimeType.startsWith("image/"),
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

  console.log(`Anexado em "${task.title}"`);
  console.log(`  ${nome} · ${Math.round(bytes.length / 1024)} KB · ${mimeType}`);
  console.log(`  backend: ${process.env.BLOB_READ_WRITE_TOKEN ? "Vercel Blob (privado)" : "disco local"}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
