"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertProjectAccess } from "@/lib/permissions";
import { VIEW_TYPES, type ViewType } from "@/lib/enums";
import { parseFilters, type ViewFilters } from "@/lib/view-filters";
import { refreshAll } from "@/lib/revalidate";

/** Filtros e ordenação persistidos por usuário + projeto + visão (seção 3.3.6). */
export async function saveViewPreference(input: {
  projectId: string;
  viewType: ViewType;
  filters?: ViewFilters;
  sortBy?: string | null;
  groupBy?: string | null;
}) {
  const user = await requireUser();
  await assertProjectAccess(user, input.projectId, false);
  const viewType = z.enum(VIEW_TYPES).parse(input.viewType);

  const current = await db.viewPreference.findUnique({
    where: {
      userId_projectId_viewType: { userId: user.id, projectId: input.projectId, viewType },
    },
  });

  const filters = input.filters ?? parseFilters(current?.filters);

  await db.viewPreference.upsert({
    where: {
      userId_projectId_viewType: { userId: user.id, projectId: input.projectId, viewType },
    },
    create: {
      userId: user.id,
      projectId: input.projectId,
      viewType,
      filters: JSON.stringify(filters),
      sortBy: input.sortBy ?? "manual",
      groupBy: input.groupBy ?? "section",
    },
    update: {
      filters: JSON.stringify(filters),
      ...(input.sortBy !== undefined ? { sortBy: input.sortBy } : {}),
      ...(input.groupBy !== undefined ? { groupBy: input.groupBy } : {}),
    },
  });

  refreshAll();
  return { ok: true };
}
