import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { InboxFeed } from "@/components/views/InboxFeed";

const LABEL: Record<string, string> = {
  TASK_ASSIGNED: "atribuiu esta tarefa a você",
  COMMENT_ADDED: "comentou em",
  DUE_DATE_CHANGED: "alterou o prazo de",
  TASK_COMPLETED: "concluiu",
  MENTIONED: "mencionou você em",
};

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { tab } = await searchParams;
  const onlyUnread = tab !== "all";

  const notifications = await db.notification.findMany({
    where: { userId: user.id, ...(onlyUnread ? { read: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const taskIds = notifications.map((n) => n.taskId).filter((id): id is string => !!id);
  const actorIds = notifications.map((n) => n.actorId).filter((id): id is string => !!id);

  const [tasks, actors] = await Promise.all([
    db.task.findMany({ where: { id: { in: taskIds } }, select: { id: true, title: true } }),
    db.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, name: true, avatarColor: true },
    }),
  ]);

  const items = notifications.map((n) => ({
    id: n.id,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
    taskId: n.taskId,
    label: LABEL[n.type] ?? "atualizou",
    taskTitle: tasks.find((t) => t.id === n.taskId)?.title ?? "uma tarefa removida",
    actor: actors.find((a) => a.id === n.actorId) ?? {
      id: "sistema",
      name: "Sistema",
      avatarColor: "#6B6B73",
    },
  }));

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <h1 className="text-[20px] font-semibold tracking-tight">Caixa de entrada</h1>
      <p className="mt-0.5 text-[12.5px] text-muted">
        O que mudou nas tarefas que você segue.
      </p>
      <InboxFeed items={items} onlyUnread={onlyUnread} />
    </div>
  );
}
