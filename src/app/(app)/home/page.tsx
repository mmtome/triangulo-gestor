import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { visibleProjectIds } from "@/lib/permissions";
import { myTasks } from "@/lib/simple-tasks";
import { SimpleTaskList } from "@/components/task/SimpleTaskList";
import { Symbol } from "@/components/brand/Logo";
import { dueBucket } from "@/lib/dates";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Star } from "lucide-react";

export default async function HomePage() {
  const user = await requireUser();
  const ids = await visibleProjectIds(user);

  const [tasks, projects] = await Promise.all([
    myTasks(user.id, false),
    db.project.findMany({
      where: { id: { in: ids }, archived: false },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { members: { where: { userId: user.id }, select: { favorite: true } } },
    }),
  ]);

  const overdue = tasks.filter((t) => dueBucket(t.dueAt ? new Date(t.dueAt) : null, false) === "overdue");
  const today = tasks.filter((t) => dueBucket(t.dueAt ? new Date(t.dueAt) : null, false) === "today");
  const week = tasks.filter((t) => dueBucket(t.dueAt ? new Date(t.dueAt) : null, false) === "week");

  const doneThisWeek = await db.task.count({
    where: {
      assigneeId: user.id,
      completed: true,
      completedAt: { gte: new Date(Date.now() - 7 * 864e5) },
    },
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  // Só a primeira letra — `capitalize` do CSS transformaria "de julho" em "De Julho".
  const rawDate = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  const dateLabel = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

  const stats = [
    { label: "Atrasadas", value: overdue.length, tone: "text-brand" },
    { label: "Para hoje", value: today.length, tone: "text-text" },
    { label: "Esta semana", value: week.length, tone: "text-text" },
    { label: "Concluídas em 7 dias", value: doneThisWeek, tone: "text-ok" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-7 flex items-start gap-4">
        <Symbol className="mt-1 h-8 w-8 shrink-0 text-brand" />
        <div>
          <p className="text-[12px] text-faint">{dateLabel}</p>
          <h1 className="text-[24px] font-semibold tracking-tight">
            {greeting}, {user.name.split(" ")[0]}.
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            Todo atrito é lucro escapando. Veja o que está travado hoje.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-[11px] uppercase tracking-wider text-faint">{s.label}</div>
            <div className={`mt-1 text-[28px] font-bold leading-none ${s.tone}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-faint">
            Prioridade de hoje
          </h2>
          <Link href="/my-tasks" className="text-[12px] text-brand transition hover:opacity-80">
            ver todas
          </Link>
        </div>
        <SimpleTaskList tasks={[...overdue, ...today].slice(0, 8)} />
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-faint">
          Projetos
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}/list`}
              className="card flex items-center gap-2.5 p-3.5 transition hover:border-faint"
            >
              <span
                className="h-4 w-4 shrink-0 rounded-[4px]"
                style={{ backgroundColor: p.color }}
              />
              <span className="min-w-0 flex-1 truncate text-[13px]">{p.name}</span>
              {p.members[0]?.favorite && <Star className="h-3 w-3 fill-warn text-warn" />}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
