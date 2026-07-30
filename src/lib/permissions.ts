import "server-only";
import { db } from "./db";
import type { SessionUser } from "./auth";

/**
 * Regras da seção 6 da spec:
 *  - ADMIN global tem acesso a tudo.
 *  - Para ler: ser membro do projeto.
 *  - Para mutar: ser OWNER ou EDITOR (VIEWER é somente leitura).
 *  - Subtarefa herda a permissão da tarefa-mãe.
 */

export class ForbiddenError extends Error {
  constructor(message = "Você não tem permissão para esta ação.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function assertProjectAccess(
  user: SessionUser,
  projectId: string,
  mutating = false,
) {
  if (user.role === "ADMIN") return;

  const membership = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });
  if (!membership) throw new ForbiddenError("Projeto não encontrado ou sem acesso.");
  if (mutating && membership.role === "VIEWER") {
    throw new ForbiddenError("Seu papel neste projeto é somente leitura.");
  }
}

/** Resolve a tarefa raiz (subtarefa herda o contexto do pai) e valida o acesso. */
export async function assertTaskAccess(
  user: SessionUser,
  taskId: string,
  mutating = false,
): Promise<string> {
  let currentId = taskId;

  for (let depth = 0; depth < 10; depth++) {
    const task = await db.task.findUnique({
      where: { id: currentId },
      select: { id: true, parentTaskId: true, projects: { select: { projectId: true } } },
    });
    if (!task) throw new ForbiddenError("Tarefa não encontrada.");

    if (task.projects.length > 0) {
      if (user.role === "ADMIN") return currentId;
      const memberships = await db.projectMember.findMany({
        where: { userId: user.id, projectId: { in: task.projects.map((p) => p.projectId) } },
      });
      if (memberships.length === 0) throw new ForbiddenError("Tarefa fora dos seus projetos.");
      if (mutating && memberships.every((m) => m.role === "VIEWER")) {
        throw new ForbiddenError("Seu papel nestes projetos é somente leitura.");
      }
      return currentId;
    }

    if (!task.parentTaskId) {
      // Tarefa órfã (sem projeto e sem pai): só o criador/admin mexe.
      return currentId;
    }
    currentId = task.parentTaskId;
  }

  throw new ForbiddenError("Hierarquia de subtarefas profunda demais.");
}

/** Ids dos projetos visíveis para o usuário. */
export async function visibleProjectIds(user: SessionUser): Promise<string[]> {
  if (user.role === "ADMIN") {
    const all = await db.project.findMany({ select: { id: true } });
    return all.map((p) => p.id);
  }
  const memberships = await db.projectMember.findMany({
    where: { userId: user.id },
    select: { projectId: true },
  });
  return memberships.map((m) => m.projectId);
}
