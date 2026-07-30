// Enums da spec (seção 4) mantidos como união de strings — o SQLite não tem enum
// nativo. A validação acontece aqui e nos schemas Zod das actions.

export const ROLES = ["ADMIN", "MEMBER"] as const;
export type Role = (typeof ROLES)[number];

export const PROJECT_ROLES = ["OWNER", "EDITOR", "VIEWER"] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

export const PROJECT_STATUSES = ["ON_TRACK", "AT_RISK", "OFF_TRACK"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  ON_TRACK: "Em dia",
  AT_RISK: "Em risco",
  OFF_TRACK: "Em atraso",
};

export const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  ON_TRACK: "#5DA283",
  AT_RISK: "#F1BD6C",
  OFF_TRACK: "#CE2B34",
};

export const NOTIFICATION_TYPES = [
  "TASK_ASSIGNED",
  "COMMENT_ADDED",
  "DUE_DATE_CHANGED",
  "TASK_COMPLETED",
  "MENTIONED",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const VIEW_TYPES = ["list", "board", "calendar"] as const;
export type ViewType = (typeof VIEW_TYPES)[number];

// Paleta de 16 cores para projetos e tags (seção 8 da spec), reancorada na
// identidade do Manual da Marca: o vermelho Triângulo abre a lista.
export const PALETTE = [
  "#CE2B34", // vermelho Triângulo
  "#E8574F",
  "#EC8D71",
  "#F1BD6C",
  "#D9C36B",
  "#A8C466",
  "#5DA283",
  "#4FB3A6",
  "#4573D2",
  "#5B8DEF",
  "#8D84E8",
  "#B57BE0",
  "#F06A6A",
  "#F9AAEF",
  "#9A9AA2",
  "#6B6B73",
] as const;
