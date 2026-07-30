import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { visibleProjectIds } from "@/lib/permissions";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { TaskDrawer } from "@/components/task/TaskDrawer";
import { AppContextProvider } from "@/components/layout/AppContext";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const projectIds = await visibleProjectIds(user);

  const [projects, unread, users] = await Promise.all([
    db.project.findMany({
      where: { id: { in: projectIds }, archived: false },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        color: true,
        members: { where: { userId: user.id }, select: { favorite: true } },
      },
    }),
    db.notification.count({ where: { userId: user.id, read: false } }),
    db.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, avatarColor: true },
    }),
  ]);

  const navProjects = projects
    .map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      favorite: p.members[0]?.favorite ?? false,
    }))
    // Favoritos primeiro (seção 5.2 da spec), depois alfabético.
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name));

  return (
    <AppContextProvider users={users} projects={navProjects} currentUser={user}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar projects={navProjects} unread={unread} user={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar projects={navProjects} users={users} />
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
      <TaskDrawer />
    </AppContextProvider>
  );
}
