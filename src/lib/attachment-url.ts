/**
 * URL de exibição de um anexo. No Vercel Blob a `storageKey` já é a URL pública;
 * no disco local ela é só o nome do arquivo e precisa passar pela rota que
 * confere a permissão. Puro — usado por componentes de cliente.
 */
export function attachmentUrl(storageKey: string): string {
  return storageKey.startsWith("http://") || storageKey.startsWith("https://")
    ? storageKey
    : `/api/uploads/${storageKey}`;
}
