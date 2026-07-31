import "server-only";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Abstração de armazenamento de anexos.
 *
 * A spec (seção 3.1) previa gravar em ./uploads com abstração para S3. Serverless
 * (Vercel) não tem disco persistente: o que é escrito some no próximo cold start.
 * Então o backend é escolhido em runtime:
 *
 *   BLOB_READ_WRITE_TOKEN definido  → Vercel Blob, store PRIVADO (produção)
 *   sem token                       → disco local em ./uploads (dev e VPS)
 *
 * O store é privado de propósito: o arquivo não fica acessível por URL solta.
 * Todo download passa por /api/uploads/[key], que confere a permissão do
 * usuário na tarefa antes de servir o conteúdo.
 *
 * A `storageKey` gravada no banco distingue os dois backends pelo prefixo:
 *   "blob:<pathname>"  → Vercel Blob
 *   "<arquivo>"        → disco local
 */

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const BLOB_PREFIX = "blob:";

export const usingBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export const isBlobKey = (key: string) => key.startsWith(BLOB_PREFIX);
export const blobPathname = (key: string) => key.slice(BLOB_PREFIX.length);

export async function putFile(
  fileName: string,
  bytes: Buffer,
  contentType: string,
): Promise<string> {
  if (usingBlob()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(fileName, bytes, {
      access: "private",
      contentType,
      addRandomSuffix: true,
    });
    return `${BLOB_PREFIX}${blob.pathname}`;
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, fileName), bytes);
  return fileName;
}

/** Conteúdo do anexo, já com a permissão conferida pela rota que chama. */
export async function readAttachment(
  key: string,
): Promise<{ body: ReadableStream | Uint8Array; contentType?: string } | null> {
  if (isBlobKey(key)) {
    const { get } = await import("@vercel/blob");
    const res = await get(blobPathname(key), { access: "private" });
    if (!res?.stream) return null;
    return { body: res.stream, contentType: res.blob.contentType ?? undefined };
  }

  try {
    const buf = await readFile(path.join(UPLOAD_DIR, key));
    return { body: new Uint8Array(buf) };
  } catch {
    return null;
  }
}
