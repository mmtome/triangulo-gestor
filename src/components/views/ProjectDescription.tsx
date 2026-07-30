"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renderRich } from "@/lib/rich";
import { updateProject } from "@/actions/project";

export function ProjectDescription({
  projectId,
  description,
}: {
  projectId: string;
  description: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(description ?? "");
  const [, start] = useTransition();

  if (editing) {
    return (
      <textarea
        autoFocus
        rows={10}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (value !== (description ?? "")) {
            start(async () => {
              await updateProject(projectId, { description: value || null });
              router.refresh();
            });
          }
        }}
        placeholder="Para que serve este projeto? Aceita **negrito**, _itálico_, listas com - e links."
        className="w-full resize-y rounded-md border border-line bg-surface px-4 py-3 text-[13px] leading-relaxed outline-none transition focus:border-brand placeholder:text-faint"
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="rich card min-h-[96px] cursor-text p-4 text-[13px] leading-relaxed text-dim transition hover:border-faint"
      dangerouslySetInnerHTML={{
        __html:
          renderRich(description) ||
          '<p class="text-faint">Clique para escrever a descrição do projeto…</p>',
      }}
    />
  );
}
