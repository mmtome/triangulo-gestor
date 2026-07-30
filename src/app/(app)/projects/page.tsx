import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { visibleProjectIds } from "@/lib/permissions";
import { Avatar } from "@/components/ui/Avatar";
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_COLOR, type ProjectStatus } from "@/lib/enums";
import { Star } from "lucide-react";

export default async function ProjectsPage() {
  const user = await requireUser();
  const ids = await visibleProjectIds(user);

  const projects = await db.project.findMany({
    where: { id: { in: ids }, archived: false },
    orderBy: { name: "asc" },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, avatarColor: true } } },
      },
      tasks: { select: { task: { select: { completed: true } } } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <h1 className="text-[20px] font-semibold tracking-tight">Projetos</h1>
      <p className="mt-0.5 text-[12.5px] text-muted">
        Um projeto por cliente ou por frente de trabalho.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => {
          const total = p.tasks.length;
          const done = p.tasks.filter((t) => t.task.completed).length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const status = p.status as ProjectStatus;
          const favorite = p.members.find((m) => m.userId === user.id)?.favorite;

          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}/list`}
              className="card p-4 transition hover:border-faint"
            >
              <div className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 h-4 w-4 shrink-0 rounded-[4px]"
                  style={{ backgroundColor: p.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate text-[14px] font-semibold">{p.name}</h3>
                    {favorite && <Star className="h-3 w-3 shrink-0 fill-warn text-warn" />}
                  </div>
                  <div
                    className="mt-0.5 flex items-center gap-1.5 text-[11px]"
                    style={{ color: PROJECT_STATUS_COLOR[status] }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: PROJECT_STATUS_COLOR[status] }}
                    />
                    {PROJECT_STATUS_LABEL[status]}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1 flex justify-between text-[11px] text-faint">
                  <span>
                    {done}/{total} concluídas
                  </span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: p.color }}
                  />
                </div>
              </div>

              <div className="mt-3 flex -space-x-1.5">
                {p.members.slice(0, 5).map((m) => (
                  <Avatar
                    key={m.userId}
                    name={m.user.name}
                    color={m.user.avatarColor}
                    size="xs"
                  />
                ))}
              </div>
            </Link>
          );
        })}

        {projects.length === 0 && (
          <div className="card col-span-full p-8 text-center text-[13px] text-muted">
            Nenhum projeto ainda. Use “+ Criar › Projeto” na barra superior.
          </div>
        )}
      </div>
    </div>
  );
}
