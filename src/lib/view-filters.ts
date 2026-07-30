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

export function parseFilters(raw: string | null | undefined): ViewFilters {
  if (!raw) return DEFAULT_FILTERS;
  try {
    return { ...DEFAULT_FILTERS, ...(JSON.parse(raw) as ViewFilters) };
  } catch {
    return DEFAULT_FILTERS;
  }
}
