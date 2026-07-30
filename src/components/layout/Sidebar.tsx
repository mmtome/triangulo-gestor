"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, Inbox, CheckSquare, LayoutGrid, Plus, Star, LogOut } from "lucide-react";
import { Wordmark } from "@/components/brand/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { NewProjectModal } from "./NewProjectModal";
import { logoutAction } from "@/actions/auth";
import type { ContextProject } from "./AppContext";

const NAV = [
  { href: "/home", label: "Página inicial", icon: Home },
  { href: "/inbox", label: "Caixa de entrada", icon: Inbox },
  { href: "/my-tasks", label: "Minhas tarefas", icon: CheckSquare },
  { href: "/projects", label: "Projetos", icon: LayoutGrid },
];

export function Sidebar({
  projects,
  unread,
  user,
}: {
  projects: ContextProject[];
  unread: number;
  user: { name: string; email: string; avatarColor: string };
}) {
  const pathname = usePathname();
  const [newProject, setNewProject] = useState(false);

  return (
    <aside className="flex w-[248px] shrink-0 flex-col border-r border-line bg-graphite">
      <div className="px-4 py-4">
        <Link href="/home" className="block">
          <Wordmark />
        </Link>
      </div>

      <nav className="px-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`mb-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] transition ${
                active
                  ? "bg-brand-soft font-medium text-text"
                  : "text-dim hover:bg-surface hover:text-text"
              }`}
            >
              <Icon className={`h-[15px] w-[15px] ${active ? "text-brand" : "text-muted"}`} />
              <span className="flex-1 truncate">{label}</span>
              {href === "/inbox" && unread > 0 && (
                <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-5 flex items-center justify-between px-4 pb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
          Projetos
        </span>
        <button
          onClick={() => setNewProject(true)}
          className="rounded p-0.5 text-muted transition hover:bg-surface hover:text-text"
          title="Novo projeto"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {projects.length === 0 && (
          <p className="px-2.5 py-2 text-xs text-faint">Nenhum projeto ainda.</p>
        )}
        {projects.map((p) => {
          const active = pathname.startsWith(`/projects/${p.id}`);
          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}/list`}
              className={`mb-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] transition ${
                active ? "bg-surface font-medium text-text" : "text-dim hover:bg-surface hover:text-text"
              }`}
            >
              <span
                className="h-[11px] w-[11px] shrink-0 rounded-[3px]"
                style={{ backgroundColor: p.color }}
              />
              <span className="flex-1 truncate">{p.name}</span>
              {p.favorite && <Star className="h-3 w-3 shrink-0 fill-warn text-warn" />}
            </Link>
          );
        })}
      </div>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={user.name} color={user.avatarColor} size="md" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-medium">{user.name}</div>
            <div className="truncate text-[11px] text-faint">{user.email}</div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded p-1.5 text-muted transition hover:bg-surface hover:text-brand"
              title="Sair"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>

      <NewProjectModal open={newProject} onClose={() => setNewProject(false)} />
    </aside>
  );
}
