import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertProjectAccess } from "@/lib/permissions";
import { Avatar } from "@/components/ui/Avatar";
import { ProjectDescription } from "@/components/views/ProjectDescription";
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_COLOR, type ProjectStatus } from "@/lib/enums";
import { fmtTZ } from "@/lib/dates";

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  await assertProjectAccess(user, projectId, false);

  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      members: { include: { user: true } },
      _count: { select: { tasks: true, sections: true } },
    },
  });

  const status = project.status as ProjectStatus;

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-1 text-[13px] font-semibold uppercase tracking-wider text-faint">
          Descrição do projeto
        </h2>
        <ProjectDescription projectId={projectId} description={project.description} />

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="card p-4">
            <div className="text-[11px] uppercase tracking-wider text-faint">Status</div>
            <div
              className="mt-1.5 flex items-center gap-2 text-[15px] font-semibold"
              style={{ color: PROJECT_STATUS_COLOR[status] }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: PROJECT_STATUS_COLOR[status] }}
              />
              {PROJECT_STATUS_LABEL[status]}
            </div>
          </div>

          <div className="card p-4">
            <div className="text-[11px] uppercase tracking-wider text-faint">Intervalo</div>
            <div className="mt-1.5 text-[13px] text-dim">
              {project.startDate
                ? fmtTZ(project.startDate, "d MMM yyyy")
                : "—"}
              {" › "}
              {project.endDate ? fmtTZ(project.endDate, "d MMM yyyy") : "—"}
            </div>
          </div>

          <div className="card p-4">
            <div className="text-[11px] uppercase tracking-wider text-faint">Volume</div>
            <div className="mt-1.5 text-[13px] text-dim">
              {project._count.tasks} tarefas · {project._count.sections} seções
            </div>
          </div>
        </div>

        <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wider text-faint">
          Membros
        </h2>
        <div className="card divide-y divide-line">
          {project.members.map((m) => (
            <div key={m.userId} className="flex items-center gap-3 p-3.5">
              <Avatar name={m.user.name} color={m.user.avatarColor} size="md" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px]">{m.user.name}</div>
                <div className="text-[11px] text-faint">{m.user.email}</div>
              </div>
              <span className="rounded border border-line px-2 py-0.5 text-[10px] text-muted">
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
