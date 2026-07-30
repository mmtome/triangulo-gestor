"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { QuickCreateTask } from "./QuickCreateTask";
import { NewProjectModal } from "./NewProjectModal";
import type { ContextProject, ContextUser } from "./AppContext";

export function Topbar({
  projects,
  users,
}: {
  projects: ContextProject[];
  users: ContextUser[];
}) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [quickTask, setQuickTask] = useState(false);
  const [newProject, setNewProject] = useState(false);
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Atalhos da seção 8: "/" foca a busca, "q" cria tarefa.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (typing) return;

      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key.toLowerCase() === "q") {
        e.preventDefault();
        setQuickTask(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-line bg-graphite px-4">
      <div className="relative">
        <button className="btn-primary py-1.5" onClick={() => setMenu((v) => !v)}>
          <Plus className="h-4 w-4" />
          Criar
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="card absolute left-0 top-[38px] z-20 w-44 overflow-hidden py-1 shadow-xl">
              <button
                className="block w-full px-3 py-2 text-left text-[13px] text-dim transition hover:bg-surface hover:text-text"
                onClick={() => {
                  setMenu(false);
                  setQuickTask(true);
                }}
              >
                Tarefa
                <span className="ml-2 text-[10px] text-faint">Q</span>
              </button>
              <button
                className="block w-full px-3 py-2 text-left text-[13px] text-dim transition hover:bg-surface hover:text-text"
                onClick={() => {
                  setMenu(false);
                  setNewProject(true);
                }}
              >
                Projeto
              </button>
            </div>
          </>
        )}
      </div>

      <form
        className="relative max-w-md flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
        <input
          ref={searchRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar tarefas e projetos…"
          className="w-full rounded-md border border-line bg-surface py-1.5 pl-9 pr-10 text-[13px] text-text outline-none transition placeholder:text-faint focus:border-brand"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line px-1.5 py-0.5 text-[10px] text-faint">
          /
        </kbd>
      </form>

      <div className="ml-auto text-[10px] font-semibold uppercase tracking-[0.2em] text-faint">
        Mapear · Resolver · Lucrar
      </div>

      <QuickCreateTask
        open={quickTask}
        onClose={() => setQuickTask(false)}
        projects={projects}
        users={users}
      />
      <NewProjectModal open={newProject} onClose={() => setNewProject(false)} />
    </header>
  );
}
