// Monta as frases legíveis do feed "Todas as atividades" (seção 5.10.8 da spec).
// Puro — roda no servidor e no cliente.

import { formatDue } from "./dates";

export type ActivityMeta = Record<string, unknown> & {
  from?: string | null;
  to?: string | null;
  toHasTime?: boolean;
  tagName?: string;
  assigneeName?: string;
  projectName?: string;
  sectionName?: string;
  title?: string;
};

/**
 * Aceita objeto (coluna Json do PostgreSQL) ou string (como ficava no SQLite),
 * para não quebrar linhas gravadas antes da migração.
 */
export function parseMeta(raw: unknown): ActivityMeta {
  if (!raw) return {};

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as ActivityMeta;
    } catch {
      return {};
    }
  }

  if (typeof raw === "object") return raw as ActivityMeta;
  return {};
}

export function describeActivity(type: string, rawMeta: unknown): string {
  const m = parseMeta(rawMeta);
  const due = (v?: string | null, hasTime?: boolean) =>
    v ? formatDue(new Date(v), !!hasTime) : "sem data";

  switch (type) {
    case "created":
      return "criou esta tarefa";
    case "completed":
      return "concluiu esta tarefa";
    case "reopened":
      return "reabriu esta tarefa";
    case "due_changed":
      return `alterou o prazo para ${due(m.to, m.toHasTime)}`;
    case "due_cleared":
      return "removeu o prazo";
    case "assigned":
      return m.assigneeName ? `atribuiu para ${m.assigneeName}` : "removeu o responsável";
    case "title_changed":
      return `renomeou para "${m.to ?? ""}"`;
    case "description_changed":
      return "editou a descrição";
    case "tag_added":
      return `adicionou a tag ${m.tagName ?? ""}`;
    case "tag_removed":
      return `removeu a tag ${m.tagName ?? ""}`;
    case "estimate_changed":
      return m.to ? `definiu a duração estimada em ${m.to}` : "removeu a duração estimada";
    case "moved":
      return m.sectionName ? `moveu para "${m.sectionName}"` : "moveu de seção";
    case "project_added":
      return `adicionou ao projeto ${m.projectName ?? ""}`;
    case "project_removed":
      return `removeu do projeto ${m.projectName ?? ""}`;
    case "subtask_added":
      return `adicionou a subtarefa "${m.title ?? ""}"`;
    case "template_applied":
      return "aplicou o template de produção";
    case "dependency_added":
      return `marcou como bloqueada por "${m.title ?? ""}"`;
    case "dependency_removed":
      return "removeu uma dependência";
    case "attachment_added":
      return `anexou ${m.title ?? "um arquivo"}`;
    default:
      return "atualizou esta tarefa";
  }
}
