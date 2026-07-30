import { requireUser } from "@/lib/auth";
import { getProjectHeader } from "@/lib/queries";
import { ProjectHeader } from "@/components/layout/ProjectHeader";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const { project, favorite } = await getProjectHeader(user, projectId);

  return (
    <div className="flex h-full flex-col">
      <ProjectHeader
        project={{
          id: project.id,
          name: project.name,
          color: project.color,
          status: project.status,
        }}
        favorite={favorite}
        members={project.members.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          avatarColor: m.user.avatarColor,
          role: m.role,
        }))}
      />
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
