import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertTaskAccess } from "@/lib/permissions";

/**
 * O drawer de detalhe é global (abre sobre qualquer visão, via ?task=ID), então
 * ele carrega a tarefa por aqui em vez de depender do payload da página atual.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { taskId } = await params;

  try {
    await assertTaskAccess(user, taskId, false);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { select: { id: true, name: true, avatarColor: true } },
      creator: { select: { id: true, name: true, avatarColor: true } },
      parent: { select: { id: true, title: true } },
      tags: { include: { tag: true } },
      collaborators: { include: { user: { select: { id: true, name: true, avatarColor: true } } } },
      projects: {
        include: {
          project: { select: { id: true, name: true, color: true } },
          section: { select: { id: true, name: true } },
        },
      },
      subtasks: {
        orderBy: [{ subtaskOrder: "asc" }, { createdAt: "asc" }],
        include: { assignee: { select: { id: true, name: true, avatarColor: true } } },
      },
      blockedBy: { include: { blocking: { select: { id: true, title: true, completed: true } } } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, avatarColor: true } } },
      },
      activities: {
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { id: true, name: true, avatarColor: true } } },
      },
      attachments: true,
    },
  });

  if (!task) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Tags e seções disponíveis nos projetos da tarefa (para os pickers).
  const projectIds = task.projects.map((p) => p.projectId);
  const [availableTags, sections, templates] = await Promise.all([
    db.tag.findMany({
      where: { OR: [{ projectId: null }, { projectId: { in: projectIds } }] },
      orderBy: { name: "asc" },
    }),
    db.section.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { order: "asc" },
      select: { id: true, name: true, projectId: true },
    }),
    db.subtaskTemplate.findMany({
      where: { OR: [{ projectId: null }, { projectId: { in: projectIds } }] },
      select: { id: true, name: true, projectId: true },
    }),
  ]);

  return NextResponse.json({ task, availableTags, sections, templates });
}
