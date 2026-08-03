/**
 * Anexa um carrossel inteiro à sua tarefa, em ordem.
 *
 * A ordem importa: o publicador monta o carrossel do Instagram na ordem de
 * criação dos anexos, então os cards são enviados um a um, em sequência, e
 * nunca em paralelo.
 *
 * Uso:  npm run carrossel:anexar -- "<pasta>" "<prefixo dos arquivos>" "<trecho do título>"
 * Ex.:  npm run carrossel:anexar -- "d:/TS/BRANDING/posts" "02 - 05-08 - Raio-X 01" "Raio-X de Processo #01"
 *
 * Idempotente: reanexar apaga os cards anteriores com o mesmo prefixo antes de
 * subir os novos, senão a segunda rodada duplicaria o carrossel.
 */

import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";
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

async function main() {
  loadEnv();

  const [pasta, prefixo, trechoTitulo] = process.argv.slice(2);
  if (!pasta || !prefixo || !trechoTitulo) {
    throw new Error(
      'Uso: npm run carrossel:anexar -- "<pasta>" "<prefixo>" "<trecho do título>"',
    );
  }

  const arquivos = readdirSync(pasta)
    .filter((f) => f.startsWith(prefixo) && f.toLowerCase().endsWith(".png"))
    .sort();
  if (arquivos.length === 0) throw new Error(`Nenhum PNG com prefixo "${prefixo}" em ${pasta}`);

  const task = await db.task.findFirst({
    where: { title: { contains: trechoTitulo, mode: "insensitive" } },
    select: { id: true, title: true },
  });
  if (!task) throw new Error(`Nenhuma tarefa com "${trechoTitulo}" no título.`);

  const admin = await db.user.findFirstOrThrow({ where: { role: "ADMIN" } });

  await db.attachment.deleteMany({
    where: { taskId: task.id, fileName: { startsWith: prefixo } },
  });

  for (const nome of arquivos) {
    const bytes = readFileSync(join(pasta, nome));
    const storageKey = await putFile(nome, bytes, "image/png");
    await db.attachment.create({
      data: {
        taskId: task.id,
        fileName: nome,
        mimeType: "image/png",
        sizeBytes: bytes.length,
        storageKey,
        isImage: true,
      },
    });
    console.log(`  ${nome} · ${Math.round(bytes.length / 1024)} KB`);
  }

  await db.activityLog.create({
    data: {
      taskId: task.id,
      actorId: admin.id,
      type: "attachment_added",
      meta: { title: `${arquivos.length} cards — ${prefixo}` },
    },
  });

  console.log(`\n${arquivos.length} cards em "${task.title}"`);
  console.log(
    `backend: ${process.env.BLOB_READ_WRITE_TOKEN ? "Vercel Blob (privado)" : "disco local"}`,
  );
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
