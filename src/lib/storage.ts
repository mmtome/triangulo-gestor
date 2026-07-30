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
 *   BLOB_READ_WRITE_TOKEN definido  → Vercel Blob (produção)
 *   sem token                       → disco local em ./uploads (dev e VPS)
 *
 * O `storageKey` gravado no banco carrega a URL completa no caso do Blob e só o
 * nome do arquivo no caso do disco — `isRemoteKey` distingue os dois.
 */

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export const usingBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export const isRemoteKey = (key: string) => key.startsWith("http://") || key.startsWith("https://");

export async function putFile(
  fileName: string,
  bytes: Buffer,
  contentType: string,
): Promise<string> {
  if (usingBlob()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(fileName, bytes, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });
    return blob.url;
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, fileName), bytes);
  return fileName;
}

export async function getLocalFile(key: string): Promise<Buffer> {
  return readFile(path.join(UPLOAD_DIR, key));
}
