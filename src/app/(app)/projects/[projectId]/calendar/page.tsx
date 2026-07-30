import { requireUser } from "@/lib/auth";
import { assertProjectAccess } from "@/lib/permissions";
import { getProjectTasks, getProjectTags, getViewPref } from "@/lib/queries";
import { serializeTasks } from "@/lib/serialize";
import { CalendarView } from "@/components/views/CalendarView";

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  await assertProjectAccess(user, projectId, false);

  const pref = await getViewPref(user, projectId, "calendar");
  const [{ tasks }, tags] = await Promise.all([
    getProjectTasks(projectId, pref.filters),
    getProjectTags(projectId),
  ]);

  return (
    <CalendarView
      projectId={projectId}
      tasks={serializeTasks(tasks)}
      tags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
      filters={pref.filters}
      sortBy={pref.sortBy}
      groupBy={pref.groupBy}
    />
  );
}
