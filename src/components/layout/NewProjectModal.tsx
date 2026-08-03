"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { PALETTE } from "@/lib/enums";
import { createProject } from "@/actions/project";

export function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(PALETTE[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    if (!name.trim()) {
      setError("Dê um nome ao projeto.");
      return;
    }
    start(async () => {
      try {
        const { id } = await createProject({ name, color, icon: "layout-list" });
        setName("");
        setError(null);
        onClose();
        router.push(`/projects/${id}/list`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível criar o projeto.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo projeto">
      <label className="mb-1.5 block text-xs font-medium text-dim">Nome do projeto</label>
      <input
        className="field"
        value={name}
        autoFocus
        placeholder="Ex.: Instagram · Triângulo Solutions"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />

      <label className="mb-2 mt-4 block text-xs font-medium text-dim">Cor</label>
      <div className="flex flex-wrap gap-2">
        {PALETTE.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`h-6 w-6 rounded-md transition ${
              color === c ? "ring-2 ring-white ring-offset-2 ring-offset-graphite" : ""
            }`}
            style={{ backgroundColor: c }}
            aria-label={`Cor ${c}`}
          />
        ))}
      </div>

      {error && <p className="mt-3 text-xs text-brand">{error}</p>}

      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose} disabled={pending}>
          Cancelar
        </button>
        <button className="btn-primary" onClick={submit} disabled={pending}>
          {pending ? "Criando…" : "Criar projeto"}
        </button>
      </div>
    </Modal>
  );
}
