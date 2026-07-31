/**
 * URL de exibição de um anexo.
 *
 * Sempre passa pela rota própria — tanto no disco local quanto no Vercel Blob,
 * cujo store é privado. É a rota que confere se o usuário tem acesso à tarefa
 * antes de servir o arquivo. Puro: usado por componentes de cliente.
 */
export function attachmentUrl(storageKey: string): string {
  return `/api/uploads/${encodeURIComponent(storageKey)}`;
}
