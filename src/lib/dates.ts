// Formatação de datas conforme a seção 7.1 da spec.
// Tudo é gravado em UTC; a exibição assume America/Sao_Paulo.

import {
  format,
  isToday,
  isTomorrow,
  isYesterday,
  isThisYear,
  differenceInCalendarDays,
  startOfDay,
  endOfWeek,
  isBefore,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const fmt = (d: Date, pattern: string) => format(d, pattern, { locale: ptBR });

/** "Hoje, 14:00" · "Amanhã" · "Segunda-feira, 11:30" · "7 ago" · "7 ago 2027" */
export function formatDue(due: Date | null | undefined, hasTime = false): string {
  if (!due) return "";
  const time = hasTime ? `, ${fmt(due, "HH:mm")}` : "";

  if (isToday(due)) return `Hoje${time}`;
  if (isTomorrow(due)) return `Amanhã${time}`;
  if (isYesterday(due)) return `Ontem${time}`;

  const diff = differenceInCalendarDays(due, new Date());
  if (diff > 0 && diff < 7) {
    const weekday = fmt(due, "EEEE");
    return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}${time}`;
  }

  if (isThisYear(due)) return `${fmt(due, "d MMM")}${time}`;
  return `${fmt(due, "d MMM yyyy")}${time}`;
}

/** Atrasada = tem prazo, o prazo passou e a tarefa não está concluída. */
export function isOverdue(due: Date | null | undefined, completed: boolean): boolean {
  if (!due || completed) return false;
  return due.getTime() < Date.now();
}

export type DueBucket = "overdue" | "today" | "week" | "later" | "none";

export const DUE_BUCKET_LABEL: Record<DueBucket, string> = {
  overdue: "Atrasadas",
  today: "Hoje",
  week: "Esta semana",
  later: "Depois",
  none: "Sem data",
};

export const DUE_BUCKET_ORDER: DueBucket[] = ["overdue", "today", "week", "later", "none"];

/** Agrupamento de Minhas Tarefas (seção 5.4). */
export function dueBucket(due: Date | null | undefined, completed: boolean): DueBucket {
  if (!due) return "none";
  if (isOverdue(due, completed)) return "overdue";
  if (isToday(due)) return "today";
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  if (isBefore(startOfDay(due), startOfDay(weekEnd)) || isToday(weekEnd)) {
    if (due.getTime() <= weekEnd.getTime()) return "week";
  }
  return "later";
}

/** "2h 30min" a partir de minutos. */
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}min`;
  if (h) return `${h}h`;
  return `${m}min`;
}

export function formatRelativeShort(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h atrás`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ${d === 1 ? "dia" : "dias"} atrás`;
  return fmt(date, "d MMM yyyy");
}

/** Rótulo do mês para o cabeçalho do calendário: "Agosto de 2026". */
export function monthTitle(date: Date): string {
  const t = fmt(date, "MMMM 'de' yyyy");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Combina uma data (yyyy-MM-dd) com hora opcional (HH:mm) num Date local. */
export function composeDue(dateStr: string, timeStr?: string | null): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (timeStr) {
    const [hh, mm] = timeStr.split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm, 0, 0);
  }
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export const toDateInput = (d: Date | null | undefined) => (d ? format(d, "yyyy-MM-dd") : "");
export const toTimeInput = (d: Date | null | undefined) => (d ? format(d, "HH:mm") : "");
