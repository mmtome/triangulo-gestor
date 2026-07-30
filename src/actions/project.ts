"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertProjectAccess } from "@/lib/permissions";
import { initialOrders } from "@/lib/ordering";
import { PROJECT_STATUSES, PROJECT_ROLES, PALETTE } from "@/lib/enums";
import { refreshAll } from "@/lib/revalidate";

const createSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao projeto.").max(120),
  color: z.string().default(PALETTE[0]),
  icon: z.string().default("layout-list"),
  description: z.string().optional().nullable(),
});

export async function createProject(input: z.infer<typeof createSchema>) {
  const user = await requireUser();
  const data = createSchema.parse(input);

  const orders = initialOrders(3);
  const project = await db.project.create({
    data: {
      name: data.name,
      color: data.color,
      icon: data.icon,
      description: data.description ?? null,
      members: { create: { userId: user.id, role: "OWNER", favorite: true } },
      sections: {
        create: [
          { name: "A fazer", order: orders[0] },
          { name: "Em andamento", order: orders[1] },
          { name: "Concluído", order: orders[2] },
        ],
      },
    },
  });

  refreshAll();
  return { id: project.id };
}

export async function createProjectAndOpen(formData: FormData) {
  const { id } = await createProject({
    name: String(formData.get("name") ?? ""),
    color: String(formData.get("color") ?? PALETTE[0]),
    icon: "layout-list",
    description: null,
  });
  redirect(`/projects/${id}/list`);
}

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().nullable().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

export async function updateProject(projectId: string, patch: z.infer<typeof updateSchema>) {
  const user = await requireUser();
  await assertProjectAccess(user, projectId, true);
  const data = updateSchema.parse(patch);

  await db.project.update({
    where: { id: projectId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.icon !== undefined ? { icon: data.icon } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.startDate !== undefined
        ? { startDate: data.startDate ? new Date(data.startDate) : null }
        : {}),
      ...(data.endDate !== undefined
        ? { endDate: data.endDate ? new Date(data.endDate) : null }
        : {}),
    },
  });

  refreshAll();
  return { ok: true };
}

export async function toggleFavorite(projectId: string) {
  const user = await requireUser();
  await assertProjectAccess(user, projectId, false);

  const membership = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });

  if (!membership) {
    await db.projectMember.create({
      data: { projectId, userId: user.id, role: "EDITOR", favorite: true },
    });
  } else {
    await db.projectMember.update({
      where: { projectId_userId: { projectId, userId: user.id } },
      data: { favorite: !membership.favorite },
    });
  }

  refreshAll();
  return { ok: true };
}

export async function archiveProject(projectId: string, archived: boolean) {
  const user = await requireUser();
  await assertProjectAccess(user, projectId, true);
  await db.project.update({ where: { id: projectId }, data: { archived } });
  refreshAll();
  return { ok: true };
}

export async function addMember(projectId: string, email: string, role: string) {
  const user = await requireUser();
  await assertProjectAccess(user, projectId, true);

  const target = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!target) throw new Error("Nenhum usuário com esse e-mail.");

  const parsedRole = z.enum(PROJECT_ROLES).parse(role);
  await db.projectMember.upsert({
    where: { projectId_userId: { projectId, userId: target.id } },
    create: { projectId, userId: target.id, role: parsedRole },
    update: { role: parsedRole },
  });

  refreshAll();
  return { ok: true };
}

export async function removeMember(projectId: string, userId: string) {
  const user = await requireUser();
  await assertProjectAccess(user, projectId, true);
  await db.projectMember.delete({ where: { projectId_userId: { projectId, userId } } });
  refreshAll();
  return { ok: true };
}
