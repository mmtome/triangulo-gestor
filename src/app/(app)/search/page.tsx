import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { visibleProjectIds } from "@/lib/permissions";
import { TASK_INCLUDE, toSimpleTask } from "@/lib/simple-tasks";
import { SimpleTaskList } from "@/components/task/SimpleTaskList";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;
  const term = (q ?? "").trim();

  if (!term) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-6">
        <h1 className="text-[20px] font-semibold tracking-tight">Busca</h1>
        <p className="mt-1 text-[13px] text-muted">
          Digite algo na barra de busca ou pressione <kbd className="rounded border border-line px-1">/</kbd>.
        </p>
      </div>
    );
  }

  const projectIds = await visibleProjectIds(user);

  // SQLite: `contains` já é case-insensitive para ASCII. Em PostgreSQL, trocar
  // por `mode: "insensitive"` (ver README > Banco de dados).
  const [tasks, projects] = await Promise.all([
    db.task.findMany({
      where: {
        title: { contains: term },
        OR: [
          { projects: { some: { projectId: { in: projectIds } } } },
          { parent: { projects: { some: { projectId: { in: projectIds } } } } },
        ],
      },
      orderBy: [{ completed: "asc" }, { dueAt: "asc" }],
      take: 50,
      include: TASK_INCLUDE,
    }),
    db.project.findMany({
      where: { id: { in: projectIds }, name: { contains: term } },
      select: { id: true, name: true, color: true },
      take: 20,
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <h1 className="text-[20px] font-semibold tracking-tight">
        Resultados para <span className="text-brand">{term}</span>
      </h1>

      {projects.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-faint">
            Projetos {projects.length}
          </h2>
          <div className="card divide-y divide-line overflow-hidden">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}/list`}
                className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition hover:bg-surface"
              >
                <span
                  className="h-3 w-3 rounded-[3px]"
                  style={{ backgroundColor: p.color }}
                />
                {p.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-faint">
          Tarefas {tasks.length}
        </h2>
        <SimpleTaskList tasks={tasks.map(toSimpleTask)} />
      </section>
    </div>
  );
}
