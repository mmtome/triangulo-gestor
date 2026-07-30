import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertProjectAccess } from "@/lib/permissions";
import { DashboardCharts } from "@/components/views/DashboardCharts";
import { startOfMonth, startOfYear, format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Period = "month" | "year" | "all";

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const { period: rawPeriod } = await searchParams;
  await assertProjectAccess(user, projectId, false);

  const period = (["month", "year", "all"].includes(rawPeriod ?? "") ? rawPeriod : "all") as Period;
  const since =
    period === "month" ? startOfMonth(new Date()) : period === "year" ? startOfYear(new Date()) : null;

  const links = await db.taskProject.findMany({
    where: { projectId, ...(since ? { task: { createdAt: { gte: since } } } : {}) },
    include: {
      task: {
        include: { assignee: { select: { id: true, name: true, avatarColor: true } } },
      },
    },
  });

  const tasks = links.map((l) => l.task);
  const now = Date.now();

  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const overdue = tasks.filter(
    (t) => !t.completed && t.dueAt && t.dueAt.getTime() < now,
  ).length;
  const unassigned = tasks.filter((t) => !t.assigneeId).length;

  // Por responsável
  const byAssignee = new Map<string, { name: string; color: string; total: number; done: number }>();
  for (const t of tasks) {
    const key = t.assignee?.id ?? "__none";
    const entry = byAssignee.get(key) ?? {
      name: t.assignee?.name ?? "Sem responsável",
      color: t.assignee?.avatarColor ?? "#6B6B73",
      total: 0,
      done: 0,
    };
    entry.total++;
    if (t.completed) entry.done++;
    byAssignee.set(key, entry);
  }

  // Por mês de prazo
  const byMonth = new Map<string, number>();
  for (const t of tasks) {
    if (!t.dueAt) continue;
    const key = format(t.dueAt, "MMM/yy", { locale: ptBR });
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }

  const cards = [
    { label: "Total de tarefas", value: total, tone: "text-text" },
    { label: "Concluídas", value: done, tone: "text-ok" },
    { label: "Atrasadas", value: overdue, tone: "text-brand" },
    { label: "Sem responsável", value: unassigned, tone: "text-warn" },
  ];

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mb-5 flex items-center gap-2">
        {(
          [
            ["month", "Este mês"],
            ["year", "Este ano"],
            ["all", "Tudo"],
          ] as const
        ).map(([key, label]) => (
          <a
            key={key}
            href={`?period=${key}`}
            className={`rounded-md border px-3 py-1 text-[12px] transition ${
              period === key
                ? "border-brand bg-brand-soft text-text"
                : "border-line text-muted hover:text-text"
            }`}
          >
            {label}
          </a>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <div className="text-[11px] uppercase tracking-wider text-faint">{c.label}</div>
            <div className={`mt-1 text-[30px] font-bold leading-none ${c.tone}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <DashboardCharts
        byAssignee={Array.from(byAssignee.values()).sort((a, b) => b.total - a.total)}
        byMonth={Array.from(byMonth.entries()).map(([month, count]) => ({ month, count }))}
      />
    </div>
  );
}
