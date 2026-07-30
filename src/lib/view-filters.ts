/**
 * Filtros de visão — arquivo separado de actions/view.ts porque um módulo
 * "use server" só pode exportar funções async.
 */

export type ViewFilters = {
  incomplete?: boolean;
  assigneeIds?: string[];
  tagIds?: string[];
};

export const DEFAULT_FILTERS: ViewFilters = {
  incomplete: true,
  assigneeIds: [],
  tagIds: [],
};

/**
 * Aceita objeto (coluna Json do PostgreSQL) ou string (como ficava no SQLite).
 * Tolerar os dois evita quebrar linhas gravadas antes da migração.
 */
export function parseFilters(raw: unknown): ViewFilters {
  if (!raw) return DEFAULT_FILTERS;

  if (typeof raw === "string") {
    try {
      return { ...DEFAULT_FILTERS, ...(JSON.parse(raw) as ViewFilters) };
    } catch {
      return DEFAULT_FILTERS;
    }
  }

  if (typeof raw === "object") return { ...DEFAULT_FILTERS, ...(raw as ViewFilters) };
  return DEFAULT_FILTERS;
}
