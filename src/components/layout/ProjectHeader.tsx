"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Star, ChevronDown, Users } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Popover } from "@/components/ui/Popover";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_COLOR,
  type ProjectStatus,
} from "@/lib/enums";
import { toggleFavorite, updateProject, addMember, removeMember } from "@/actions/project";

const TABS = [
  { seg: "overview", label: "Visão geral" },
  { seg: "list", label: "Lista" },
  { seg: "board", label: "Quadro" },
  { seg: "calendar", label: "Calendário" },
  { seg: "dashboard", label: "Painel" },
];

type Member = {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  role: string;
};

export function ProjectHeader({
  project,
  favorite,
  members,
}: {
  project: { id: string; name: string; color: string; status: string };
  favorite: boolean;
  members: Member[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [, start] = useTransition();
  const [name, setName] = useState(project.name);
  const [membersOpen, setMembersOpen] = useState(false);

  const status = project.status as ProjectStatus;

  return (
    <header className="shrink-0 border-b border-line bg-graphite px-5 pt-3.5">
      <div className="flex items-center gap-2.5">
        <span
          className="h-4 w-4 shrink-0 rounded-[4px]"
          style={{ backgroundColor: project.color }}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            const v = name.trim();
            if (v && v !== project.name) {
              start(async () => {
                await updateProject(project.id, { name: v });
                router.refresh();
              });
            } else if (!v) setName(project.name);
          }}
          className="min-w-0 max-w-md rounded bg-transparent px-1 py-0.5 text-[17px] font-semibold tracking-tight outline-none transition hover:bg-surface focus:bg-surface"
        />

        <button
          onClick={() =>
            start(async () => {
              await toggleFavorite(project.id);
              router.refresh();
            })
          }
          className="rounded p-1 transition hover:bg-surface"
          title={favorite ? "Remover dos favoritos" : "Favoritar"}
        >
          <Star
            className={`h-4 w-4 ${favorite ? "fill-warn text-warn" : "text-muted"}`}
          />
        </button>

        <Popover
          width="w-44"
          trigger={({ toggle }) => (
            <button
              onClick={toggle}
              className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-[11px] transition hover:border-faint"
              style={{ color: PROJECT_STATUS_COLOR[status] }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: PROJECT_STATUS_COLOR[status] }}
              />
              {PROJECT_STATUS_LABEL[status]}
              <ChevronDown className="h-3 w-3 text-muted" />
            </button>
          )}
        >
          {({ close }) => (
            <div className="py-1">
              {PROJECT_STATUSES.map((s) => (
                <button
                  key={s}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition hover:bg-surface"
                  onClick={() => {
                    close();
                    start(async () => {
                      await updateProject(project.id, { status: s });
                      router.refresh();
                    });
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: PROJECT_STATUS_COLOR[s] }}
                  />
                  {PROJECT_STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          )}
        </Popover>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {members.slice(0, 5).map((m) => (
              <Avatar key={m.id} name={m.name} color={m.avatarColor} size="sm" title={m.name} />
            ))}
          </div>
          <button
            onClick={() => setMembersOpen(true)}
            className="btn-ghost py-1 text-[12px]"
          >
            <Users className="h-3.5 w-3.5" />
            Membros
          </button>
        </div>
      </div>

      <nav className="mt-3 flex gap-1">
        {TABS.map((t) => {
          const href = `/projects/${project.id}/${t.seg}`;
          const active = pathname === href;
          return (
            <Link
              key={t.seg}
              href={href}
              className={`-mb-px border-b-2 px-3 pb-2.5 pt-1 text-[13px] transition ${
                active
                  ? "border-brand font-medium text-text"
                  : "border-transparent text-muted hover:text-dim"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <MembersModal
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        projectId={project.id}
        members={members}
      />
    </header>
  );
}

function MembersModal({
  open,
  onClose,
  projectId,
  members,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  members: Member[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("EDITOR");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Modal open={open} onClose={onClose} title="Membros do projeto">
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-2.5">
            <Avatar name={m.name} color={m.avatarColor} size="md" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px]">{m.name}</div>
              <div className="truncate text-[11px] text-faint">{m.email}</div>
            </div>
            <span className="rounded border border-line px-1.5 py-0.5 text-[10px] text-muted">
              {m.role}
            </span>
            <button
              className="text-[11px] text-faint transition hover:text-brand"
              onClick={() =>
                start(async () => {
                  await removeMember(projectId, m.id);
                  router.refresh();
                })
              }
            >
              remover
            </button>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <label className="mb-1.5 block text-xs font-medium text-dim">Adicionar por e-mail</label>
        <div className="flex gap-2">
          <input
            className="field"
            value={email}
            placeholder="pessoa@triangulosolutions.com.br"
            onChange={(e) => setEmail(e.target.value)}
          />
          <select className="field w-32" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="OWNER">Owner</option>
            <option value="EDITOR">Editor</option>
            <option value="VIEWER">Viewer</option>
          </select>
          <button
            className="btn-primary shrink-0"
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  await addMember(projectId, email, role);
                  setEmail("");
                  setError(null);
                  router.refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Erro ao adicionar.");
                }
              })
            }
          >
            Adicionar
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-brand">{error}</p>}
      </div>
    </Modal>
  );
}
