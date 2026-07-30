import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertProjectAccess } from "@/lib/permissions";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { projectId } = await params;
  try {
    await assertProjectAccess(user, projectId, false);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sections = await db.section.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
    select: { id: true, name: true },
  });

  return NextResponse.json({ sections });
}
