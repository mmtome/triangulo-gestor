"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { createTask } from "@/actions/task";
import { composeDue } from "@/lib/dates";
import type { ContextProject, ContextUser } from "./AppContext";

type Section = { id: string; name: string };

export function QuickCreateTask({
  open,
  onClose,
  projects,
  users,
  defaultProjectId,
}: {
  open: boolean;
  onClose: () => void;
  projects: ContextProject[];
  users: ContextUser[];
  defaultProjectId?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? "");
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (open && defaultProjectId) setProjectId(defaultProjectId);
  }, [open, defaultProjectId]);

  // Carrega as seções do projeto escolhido para permitir "projeto › seção".
  useEffect(() => {
    if (!projectId) {
      setSections([]);
      return;
    }
    let alive = true;
    fetch(`/api/projects/${projectId}/sections`)
      .then((r) => (r.ok ? r.json() : { sections: [] }))
      .then((d) => {
        if (!alive) return;
        setSections(d.sections ?? []);
        setSectionId(d.sections?.[0]?.id ?? "");
      })
      .catch(() => setSections([]));
    return () => {
      alive = false;
    };
  }, [projectId]);

  function submit() {
    if (!title.trim()) {
      setError("Escreva o título da tarefa.");
      return;
    }
    start(async () => {
      try {
        await createTask({
          title,
          projectId: projectId || null,
          sectionId: sectionId || null,
          assigneeId: assigneeId || null,
          dueAt: date ? composeDue(date, time || null).toISOString() : null,
          dueHasTime: !!time,
        });
        setTitle("");
        setDate("");
        setTime("");
        setError(null);
        onClose();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível criar a tarefa.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova tarefa">
      <label className="mb-1.5 block text-xs font-medium text-dim">Título</label>
      <input
        className="field"
        autoFocus
        value={title}
        placeholder="Ex.: Raio-X de Processo #03 — carrossel"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
      />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-dim">Projeto</label>
          <select
            className="field"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Sem projeto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-dim">Seção</label>
          <select
            className="field"
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            disabled={!sections.length}
          >
            {sections.length === 0 && <option value="">—</option>}
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-dim">Responsável</label>
          <select
            className="field"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            <option value="">Ninguém</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-dim">Prazo</label>
          <input
            type="date"
            className="field"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-dim">Hora</label>
          <input
            type="time"
            className="field"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            disabled={!date}
          />
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-brand">{error}</p>}

      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose} disabled={pending}>
          Cancelar
        </button>
        <button className="btn-primary" onClick={submit} disabled={pending}>
          {pending ? "Criando…" : "Criar tarefa"}
        </button>
      </div>
    </Modal>
  );
}
