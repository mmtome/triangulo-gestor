// Formatação de datas conforme as seções 7.1 e 7.8 da spec.
//
// Tudo é gravado em UTC e EXIBIDO em America/Sao_Paulo — fixo, nunca no fuso da
// máquina. Isso não é preferência: o mesmo componente renderiza no servidor
// (Vercel roda em UTC) e hidrata no navegador (horário de Brasília). Usar o fuso
// local faria "18:00" virar "21:00" no HTML do servidor e quebraria a hidratação.

import {
  differenceInCalendarDays,
  endOfWeek,
  format,
  isSameDay,
  startOfDay,
  isBefore,
} from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

export const TZ = "America/Sao_Paulo";

/** Formata no fuso da marca. Determinístico em servidor e cliente. */
export const fmtTZ = (d: Date, pattern: string) =>
  formatInTimeZone(d, TZ, pattern, { locale: ptBR });

/** "Agora" com os componentes de data já no fuso de São Paulo. */
const nowZoned = () => toZonedTime(new Date(), TZ);
const zoned = (d: Date) => toZonedTime(d, TZ);

/** Chave de dia (yyyy-MM-dd) no fuso da marca — usada para agrupar no calendário. */
export const zonedDayKey = (d: Date) => formatInTimeZone(d, TZ, "yyyy-MM-dd");

/** "Hoje, 14:00" · "Amanhã" · "Segunda-feira, 11:30" · "7 ago" · "7 ago 2027" */
export function formatDue(due: Date | null | undefined, hasTime = false): string {
  if (!due) return "";
  const time = hasTime ? `, ${fmtTZ(due, "HH:mm")}` : "";

  const d = zoned(due);
  const today = nowZoned();
  const diff = differenceInCalendarDays(d, today);

  if (diff === 0) return `Hoje${time}`;
  if (diff === 1) return `Amanhã${time}`;
  if (diff === -1) return `Ontem${time}`;

  if (diff > 0 && diff < 7) {
    const weekday = fmtTZ(due, "EEEE");
    return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}${time}`;
  }

  if (d.getFullYear() === today.getFullYear()) return `${fmtTZ(due, "d MMM")}${time}`;
  return `${fmtTZ(due, "d MMM yyyy")}${time}`;
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

  const d = zoned(due);
  const today = nowZoned();
  if (isSameDay(d, today)) return "today";

  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  if (isBefore(startOfDay(d), startOfDay(weekEnd)) || isSameDay(d, weekEnd)) return "week";
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
  const dd = Math.floor(h / 24);
  if (dd < 30) return `${dd} ${dd === 1 ? "dia" : "dias"} atrás`;
  return fmtTZ(date, "d MMM yyyy");
}

/**
 * "Agora" como data de parede de São Paulo. O calendário navega sobre datas de
 * parede (não instantes), então servidor e cliente produzem a mesma grade.
 */
export const zonedNow = () => toZonedTime(new Date(), TZ);

/** Converte um instante para a data de parede de São Paulo. */
export const toZonedDate = (d: Date) => toZonedTime(d, TZ);

/**
 * Rótulo do mês: "Agosto de 2026". Recebe uma data de PAREDE (já convertida),
 * por isso usa `format` puro — aplicar o fuso de novo deslocaria o mês.
 */
export function monthTitle(wallDate: Date): string {
  const t = format(wallDate, "MMMM 'de' yyyy", { locale: ptBR });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Saudação da home, pelo relógio de São Paulo. */
export function greeting(): string {
  const h = nowZoned().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/** "Quinta-feira, 30 de julho" — só a primeira letra maiúscula. */
export function todayLabel(): string {
  const t = fmtTZ(new Date(), "EEEE, d 'de' MMMM");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Combina data (yyyy-MM-dd) e hora (HH:mm) digitadas pelo usuário num instante
 * UTC, interpretando os valores como horário de São Paulo.
 */
export function composeDue(dateStr: string, timeStr?: string | null): Date {
  const time = timeStr || "12:00";
  // fromZonedTime lê "data e hora de parede + fuso" e devolve o instante UTC,
  // independente do fuso em que o processo roda.
  return fromZonedTime(`${dateStr}T${time}:00`, TZ);
}

export const toDateInput = (d: Date | null | undefined) => (d ? fmtTZ(d, "yyyy-MM-dd") : "");
export const toTimeInput = (d: Date | null | undefined) => (d ? fmtTZ(d, "HH:mm") : "");
