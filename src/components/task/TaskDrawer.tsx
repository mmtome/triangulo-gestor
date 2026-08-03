"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  X,
  Check,
  Link2,
  Maximize2,
  Minimize2,
  ThumbsUp,
  Trash2,
  Plus,
  ChevronRight,
  Ban,
  Paperclip,
  Wand2,
  Send,
  AlertTriangle,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { CheckCircle } from "./CheckCircle";
import { AssigneePicker, DueDatePicker, TagPicker, type TagLite } from "./pickers";
import { useAppContext } from "@/components/layout/AppContext";
import { formatDue, formatDuration, formatRelativeShort, isOverdue } from "@/lib/dates";
import { describeActivity } from "@/lib/activity-format";
import { renderRich } from "@/lib/rich";
import { attachmentUrl } from "@/lib/attachment-url";
import {
  updateTask,
  toggleComplete,
  setTags,
  createTask,
  deleteTask,
  toggleLike,
  applySubtaskTemplate,
  removeDependency,
  setAprovacaoPublicacao,
  setLegenda,
} from "@/actions/task";
import { createTag } from "@/actions/tag";
import { addComment } from "@/actions/comment";

/* -------------------------------------------------------------------------- */
/* tipos do payload de /api/tasks/[taskId]                                     */
/* -------------------------------------------------------------------------- */

type Person = { id: string; name: string; avatarColor: string };

type DrawerTask = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  dueAt: string | null;
  dueHasTime: boolean;
  estimatedMinutes: number | null;
  likes: number;
  createdAt: string;
  assignee: Person | null;
  creator: Person;
  parent: { id: string; title: string } | null;
  tags: { tag: TagLite }[];
  collaborators: { user: Person }[];
  projects: {
    projectId: string;
    project: { id: string; name: string; color: string };
    section: { id: string; name: string } | null;
  }[];
  subtasks: {
    id: string;
    title: string;
    completed: boolean;
    dueAt: string | null;
    dueHasTime: boolean;
    assignee: Person | null;
  }[];
  blockedBy: { blockingId: string; blocking: { id: string; title: string; completed: boolean } }[];
  comments: { id: string; body: string; createdAt: string; author: Person }[];
  activities: { id: string; type: string; meta: unknown; createdAt: string; actor: Person }[];
  attachments: { id: string; fileName: string; isImage: boolean; storageKey: string }[];
  legenda: string | null;
  aprovadoParaPublicar: boolean;
  publicadoEm: string | null;
  publicacaoStatus: string | null;
  publicacaoErro: string | null;
  instagramPermalink: string | null;
};

type Payload = {
  task: DrawerTask;
  availableTags: TagLite[];
  sections: { id: string; name: string; projectId: string }[];
  templates: { id: string; name: string; projectId: string | null }[];
};

/* -------------------------------------------------------------------------- */

export function TaskDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const taskId = params.get("task");

  const { users } = useAppContext();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [full, setFull] = useState(false);
  const [tab, setTab] = useState<"comments" | "activity">("comments");
  const [, start] = useTransition();

  const load = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${id}`, { cache: "no-store" });
      if (!res.ok) {
        setData(null);
        return;
      }
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!taskId) {
      setData(null);
      return;
    }
    load(taskId);
  }, [taskId, load]);

  const close = useCallback(() => {
    const next = new URLSearchParams(params.toString());
    next.delete("task");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  useEffect(() => {
    if (!taskId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [taskId, close]);

  /** Executa a mutação, recarrega o drawer e revalida a visão de fundo. */
  const mutate = useCallback(
    (fn: () => Promise<unknown>) => {
      start(async () => {
        await fn();
        if (taskId) await load(taskId);
        router.refresh();
      });
    },
    [taskId, load, router],
  );

  if (!taskId) return null;

  const t = data?.task;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 animate-fade" onClick={close} />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-screen flex-col border-l border-line bg-graphite shadow-2xl animate-drawer ${
          full ? "w-full" : "w-full max-w-[560px]"
        }`}
      >
        {loading && !t && (
          <div className="flex h-full items-center justify-center text-sm text-faint">
            Carregando…
          </div>
        )}
        {!loading && !t && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-faint">
            Tarefa não encontrada ou sem acesso.
            <button className="btn-ghost" onClick={close}>
              Fechar
            </button>
          </div>
        )}

        {t && data && (
          <>
            <DrawerHeader
              task={t}
              full={full}
              onToggleFull={() => setFull((v) => !v)}
              onClose={close}
              mutate={mutate}
            />

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
              {t.parent && (
                <button
                  onClick={() => router.push(`${pathname}?task=${t.parent!.id}`, { scroll: false })}
                  className="mt-4 flex items-center gap-1 text-[11px] text-faint transition hover:text-brand"
                >
                  {t.parent.title}
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-dim">subtarefa</span>
                </button>
              )}

              <TitleField task={t} mutate={mutate} />

              {t.blockedBy.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-warn/30 bg-warn/10 px-3 py-2 text-[12px] text-warn">
                  <Ban className="h-3.5 w-3.5" />
                  <span>Aguardando:</span>
                  {t.blockedBy.map((d) => (
                    <span key={d.blockingId} className="flex items-center gap-1">
                      <button
                        className="underline underline-offset-2"
                        onClick={() =>
                          router.push(`${pathname}?task=${d.blockingId}`, { scroll: false })
                        }
                      >
                        {d.blocking.title}
                      </button>
                      <button
                        onClick={() => mutate(() => removeDependency(t.id, d.blockingId))}
                        aria-label="Remover dependência"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <FieldGrid task={t} data={data} users={users} mutate={mutate} />

              <DescriptionField task={t} mutate={mutate} />

              <Subtasks task={t} data={data} mutate={mutate} />

              <Attachments task={t} onUploaded={() => load(t.id)} />

              <Feed task={t} tab={tab} setTab={setTab} />
            </div>

            <CommentBox taskId={t.id} mutate={mutate} />
          </>
        )}
      </aside>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Header                                                                      */
/* -------------------------------------------------------------------------- */

function DrawerHeader({
  task,
  full,
  onToggleFull,
  onClose,
  mutate,
}: {
  task: DrawerTask;
  full: boolean;
  onToggleFull: () => void;
  onClose: () => void;
  mutate: (fn: () => Promise<unknown>) => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
      <button
        onClick={() => mutate(() => toggleComplete(task.id, !task.completed))}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition ${
          task.completed
            ? "border-ok bg-ok/15 text-ok"
            : "border-line text-dim hover:border-ok hover:text-ok"
        }`}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
        {task.completed ? "Concluída" : "Marcar como concluída"}
      </button>

      <div className="ml-2 flex -space-x-1.5">
        {task.collaborators.map((c) => (
          <Avatar key={c.user.id} name={c.user.name} color={c.user.avatarColor} size="sm" />
        ))}
      </div>

      <div className="ml-auto flex items-center gap-0.5">
        <button
          onClick={() => mutate(() => toggleLike(task.id))}
          className={`rounded p-1.5 transition hover:bg-surface ${
            task.likes > 0 ? "text-brand" : "text-muted hover:text-text"
          }`}
          title="Curtir"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded p-1.5 text-muted transition hover:bg-surface hover:text-text"
          title={copied ? "Link copiado" : "Copiar link"}
        >
          <Link2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onToggleFull}
          className="rounded p-1.5 text-muted transition hover:bg-surface hover:text-text"
          title={full ? "Reduzir" : "Tela cheia"}
        >
          {full ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => {
            if (confirm("Excluir esta tarefa e todas as subtarefas?")) {
              mutate(async () => {
                await deleteTask(task.id);
                onClose();
              });
            }
          }}
          className="rounded p-1.5 text-muted transition hover:bg-surface hover:text-brand"
          title="Excluir tarefa"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onClose}
          className="rounded p-1.5 text-muted transition hover:bg-surface hover:text-text"
          title="Fechar (Esc)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Título                                                                      */
/* -------------------------------------------------------------------------- */

function TitleField({
  task,
  mutate,
}: {
  task: DrawerTask;
  mutate: (fn: () => Promise<unknown>) => void;
}) {
  const [value, setValue] = useState(task.title);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setValue(task.title), [task.id, task.title]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const next = value.trim();
        if (next && next !== task.title) mutate(() => updateTask(task.id, { title: next }));
        else if (!next) setValue(task.title);
      }}
      className={`mt-4 w-full resize-none bg-transparent text-[20px] font-semibold leading-snug tracking-tight outline-none ${
        task.completed ? "text-muted line-through" : "text-text"
      }`}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Grade de campos                                                             */
/* -------------------------------------------------------------------------- */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[132px_1fr] items-start gap-2 py-1">
      <div className="pt-1.5 text-[12px] text-muted">{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Aprovação para publicar                                                     */
/* -------------------------------------------------------------------------- */

/**
 * O check que libera a publicação automática.
 *
 * Só aparece quando faz sentido: a tarefa precisa ter data e pelo menos uma
 * imagem anexada — sem os dois não há o que publicar nem quando. Depois de
 * publicado, vira um selo com o link do post.
 */
function AprovacaoDePublicacao({
  task,
  mutate,
}: {
  task: DrawerTask;
  mutate: (fn: () => Promise<unknown>) => void;
}) {
  const temArte = task.attachments.some((a) => a.isImage);
  if (!temArte && !task.aprovadoParaPublicar && !task.publicadoEm) return null;

  if (task.publicadoEm) {
    return (
      <Row label="Instagram">
        <div className="flex items-center gap-2 py-1 text-[12px] text-dim">
          <Send className="h-3.5 w-3.5 text-[#CE2B34]" />
          Publicado em {formatRelativeShort(new Date(task.publicadoEm))}
          {task.instagramPermalink && (
            <a
              href={task.instagramPermalink}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-text"
            >
              ver post
            </a>
          )}
        </div>
      </Row>
    );
  }

  const semData = !task.dueAt;
  const falhou = task.publicacaoErro && task.publicacaoStatus !== "publicado";

  return (
    <Row label="Instagram">
      <div className="py-1">
        <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-dim">
          <input
            type="checkbox"
            checked={task.aprovadoParaPublicar}
            disabled={semData || !temArte}
            onChange={(e) =>
              mutate(() => setAprovacaoPublicacao(task.id, e.target.checked))
            }
            className="h-3.5 w-3.5 accent-[#CE2B34]"
          />
          Aprovado para publicar
        </label>

        <p className="mt-1 text-[11px] text-faint">
          {semData
            ? "Defina a data de conclusão: é ela que marca o dia da publicação."
            : !temArte
              ? "Anexe a arte do post para poder aprovar."
              : task.aprovadoParaPublicar
                ? `Sobe sozinho na data marcada, com ${task.attachments.filter((a) => a.isImage).length} imagem(ns).`
                : "Ao marcar, o post sobe sozinho na data marcada."}
        </p>

        {falhou && (
          <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-[#e0a2a6]">
            <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
            {task.publicacaoStatus === "sem_credencial"
              ? "Falta conectar a conta do Instagram (credencial de publicação)."
              : task.publicacaoErro}
          </p>
        )}
      </div>
    </Row>
  );
}

/**
 * A legenda que vai como texto do post. Fica junto do check de aprovação de
 * propósito: aprovar sem ler o que vai junto da imagem seria aprovar metade.
 *
 * Grava ao sair do campo, e não a cada tecla — senão seria uma escrita no
 * banco por letra digitada.
 */
function LegendaDoPost({
  task,
  mutate,
}: {
  task: DrawerTask;
  mutate: (fn: () => Promise<unknown>) => void;
}) {
  const [texto, setTexto] = useState(task.legenda ?? "");
  const [aberto, setAberto] = useState(false);

  useEffect(() => setTexto(task.legenda ?? ""), [task.id, task.legenda]);

  const temArte = task.attachments.some((a) => a.isImage);
  if (!temArte && !task.legenda) return null;

  const limite = 2200;

  return (
    <Row label="Legenda do post">
      <div className="py-1">
        {!aberto && (
          <button
            onClick={() => setAberto(true)}
            className="w-full text-left text-[12px] leading-relaxed text-dim transition hover:text-text"
          >
            {texto ? (
              <>
                <span className="line-clamp-3 whitespace-pre-wrap">{texto}</span>
                <span className="mt-1 block text-[11px] text-faint">
                  {texto.length}/{limite} · clique para editar
                </span>
              </>
            ) : (
              <span className="text-[12px] text-faint">
                Escrever a legenda que vai junto com a arte…
              </span>
            )}
          </button>
        )}

        {aberto && (
          <>
            <textarea
              autoFocus
              value={texto}
              maxLength={limite}
              onChange={(e) => setTexto(e.target.value)}
              onBlur={() => {
                setAberto(false);
                if ((task.legenda ?? "") !== texto) {
                  mutate(() => setLegenda(task.id, texto));
                }
              }}
              rows={12}
              className="w-full resize-y rounded-md border border-line bg-surface px-3 py-2 text-[12px] leading-relaxed text-text outline-none focus:border-faint"
            />
            <div className="mt-1 text-[11px] text-faint">
              {texto.length}/{limite} caracteres · clique fora para salvar
            </div>
          </>
        )}
      </div>
    </Row>
  );
}

function FieldGrid({
  task,
  data,
  users,
  mutate,
}: {
  task: DrawerTask;
  data: Payload;
  users: { id: string; name: string; email: string; avatarColor: string }[];
  mutate: (fn: () => Promise<unknown>) => void;
}) {
  const due = task.dueAt ? new Date(task.dueAt) : null;
  const [estimate, setEstimate] = useState(task.estimatedMinutes ?? "");

  useEffect(() => setEstimate(task.estimatedMinutes ?? ""), [task.id, task.estimatedMinutes]);

  return (
    <div className="mt-4 border-t border-line pt-3">
      <Row label="Responsável">
        <AssigneePicker
          value={task.assignee}
          users={users}
          onChange={(id) => mutate(() => updateTask(task.id, { assigneeId: id }))}
        />
      </Row>

      <Row label="Data de conclusão">
        <DueDatePicker
          dueAt={due}
          hasTime={task.dueHasTime}
          overdue={isOverdue(due, task.completed)}
          onChange={(iso, hasTime) =>
            mutate(() => updateTask(task.id, { dueAt: iso, dueHasTime: hasTime }))
          }
        />
      </Row>

      <AprovacaoDePublicacao task={task} mutate={mutate} />
      <LegendaDoPost task={task} mutate={mutate} />

      <Row label="Tags">
        <TagPicker
          selected={task.tags.map((t) => t.tag)}
          available={data.availableTags}
          onChange={(ids) => mutate(() => setTags(task.id, ids))}
          onCreate={async (name, color) => {
            const projectId = task.projects[0]?.projectId ?? null;
            const { id } = await createTag({ name, color, projectId });
            await setTags(task.id, [...task.tags.map((t) => t.tag.id), id]);
          }}
        />
      </Row>

      <Row label="Projetos">
        <div className="flex flex-wrap gap-1.5 py-1">
          {task.projects.map((p) => (
            <Link
              key={p.projectId}
              href={`/projects/${p.projectId}/list`}
              className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-[11px] text-dim transition hover:border-faint hover:text-text"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: p.project.color }}
              />
              {p.project.name}
              {p.section && <span className="text-faint">› {p.section.name}</span>}
            </Link>
          ))}
          {task.projects.length === 0 && (
            <span className="text-[12px] text-faint">
              {task.parent ? "Herda o contexto da tarefa-mãe" : "Sem projeto"}
            </span>
          )}
        </div>
      </Row>

      <Row label="Duração estimada">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={estimate}
            onChange={(e) => setEstimate(e.target.value === "" ? "" : Number(e.target.value))}
            onBlur={() =>
              mutate(() =>
                updateTask(task.id, {
                  estimatedMinutes: estimate === "" ? null : Number(estimate),
                }),
              )
            }
            placeholder="min"
            className="w-20 rounded-md bg-transparent px-1.5 py-1 text-[13px] outline-none transition hover:bg-surface focus:bg-surface"
          />
          {task.estimatedMinutes ? (
            <span className="text-[12px] text-faint">{formatDuration(task.estimatedMinutes)}</span>
          ) : null}
        </div>
      </Row>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Descrição                                                                   */
/* -------------------------------------------------------------------------- */

function DescriptionField({
  task,
  mutate,
}: {
  task: DrawerTask;
  mutate: (fn: () => Promise<unknown>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.description ?? "");

  useEffect(() => {
    setValue(task.description ?? "");
    setEditing(false);
  }, [task.id, task.description]);

  return (
    <div className="mt-5">
      <div className="mb-1.5 text-[12px] text-muted">Descrição</div>
      {editing ? (
        <textarea
          autoFocus
          value={value}
          rows={6}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            setEditing(false);
            if (value !== (task.description ?? "")) {
              mutate(() => updateTask(task.id, { description: value || null }));
            }
          }}
          placeholder="O que precisa ser feito? Aceita **negrito**, _itálico_, listas com - e links."
          className="w-full resize-y rounded-md border border-line bg-surface px-3 py-2 text-[13px] leading-relaxed outline-none transition focus:border-brand placeholder:text-faint"
        />
      ) : (
        <div
          onClick={() => setEditing(true)}
          className="rich min-h-[52px] cursor-text rounded-md px-3 py-2 text-[13px] leading-relaxed text-dim transition hover:bg-surface"
          dangerouslySetInnerHTML={{
            __html:
              renderRich(task.description) ||
              '<p class="text-faint">Adicionar descrição…</p>',
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Subtarefas                                                                  */
/* -------------------------------------------------------------------------- */

function Subtasks({
  task,
  data,
  mutate,
}: {
  task: DrawerTask;
  data: Payload;
  mutate: (fn: () => Promise<unknown>) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  const done = task.subtasks.filter((s) => s.completed).length;
  const template = data.templates[0];

  return (
    <div className="mt-6">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="text-[12px] text-muted">
          Subtarefas{" "}
          {task.subtasks.length > 0 && (
            <span className="text-faint">
              {done}/{task.subtasks.length}
            </span>
          )}
        </div>
        {template && task.subtasks.length === 0 && (
          <button
            onClick={() => mutate(() => applySubtaskTemplate(task.id, template.id))}
            className="inline-flex items-center gap-1 text-[11px] text-brand transition hover:opacity-80"
            title="Cria o fluxo DEMANDAR → PUBLICAÇÃO com prazos retroativos"
          >
            <Wand2 className="h-3 w-3" />
            Aplicar {template.name}
          </button>
        )}
      </div>

      <div className="rounded-md border border-line">
        {task.subtasks.map((s) => {
          const due = s.dueAt ? new Date(s.dueAt) : null;
          return (
            <div
              key={s.id}
              className="flex cursor-pointer items-center gap-2.5 border-b border-line px-3 py-2 last:border-b-0 hover:bg-surface"
              onClick={() => router.push(`${pathname}?task=${s.id}`, { scroll: false })}
            >
              <CheckCircle
                completed={s.completed}
                size="sm"
                onToggle={() => mutate(() => toggleComplete(s.id, !s.completed))}
              />
              <span
                className={`flex-1 truncate text-[13px] ${
                  s.completed ? "text-faint line-through" : "text-dim"
                }`}
              >
                {s.title}
              </span>
              {due && (
                <span
                  className={`shrink-0 text-[11px] ${
                    isOverdue(due, s.completed) ? "text-brand" : "text-faint"
                  }`}
                >
                  {formatDue(due, s.dueHasTime)}
                </span>
              )}
              {s.assignee ? (
                <Avatar name={s.assignee.name} color={s.assignee.avatarColor} size="xs" />
              ) : (
                <span className="h-5 w-5" />
              )}
            </div>
          );
        })}

        {adding ? (
          <div className="px-3 py-2">
            <input
              autoFocus
              value={title}
              placeholder="Título da subtarefa e Enter"
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-faint"
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && title.trim()) {
                  const v = title.trim();
                  setTitle("");
                  mutate(() => createTask({ title: v, parentTaskId: task.id }));
                } else if (e.key === "Escape") {
                  setAdding(false);
                  setTitle("");
                }
              }}
              onBlur={() => {
                if (title.trim()) {
                  const v = title.trim();
                  mutate(() => createTask({ title: v, parentTaskId: task.id }));
                }
                setTitle("");
                setAdding(false);
              }}
            />
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-faint transition hover:bg-surface hover:text-dim"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar subtarefa
          </button>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Anexos                                                                      */
/* -------------------------------------------------------------------------- */

function Attachments({ task, onUploaded }: { task: DrawerTask; onUploaded: () => void }) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("taskId", task.id);
      await fetch("/api/uploads", { method: "POST", body: fd });
      onUploaded();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="mb-1.5 text-[12px] text-muted">Anexos</div>
      <div className="flex flex-wrap items-center gap-2">
        {task.attachments.map((a) => (
          <a
            key={a.id}
            href={attachmentUrl(a.storageKey)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-[11px] text-dim transition hover:border-faint hover:text-text"
          >
            <Paperclip className="h-3 w-3" />
            {a.fileName}
          </a>
        ))}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded-md border border-dashed border-faint px-2 py-1 text-[11px] text-faint transition hover:border-brand hover:text-brand disabled:opacity-50"
        >
          {busy ? "Enviando…" : "+ anexo"}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Feed: comentários e atividades                                              */
/* -------------------------------------------------------------------------- */

function Feed({
  task,
  tab,
  setTab,
}: {
  task: DrawerTask;
  tab: "comments" | "activity";
  setTab: (t: "comments" | "activity") => void;
}) {
  return (
    <div className="mt-7">
      <div className="mb-3 flex gap-4 border-b border-line">
        {(
          [
            ["comments", `Comentários${task.comments.length ? ` (${task.comments.length})` : ""}`],
            ["activity", "Todas as atividades"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 pb-2 text-[12px] transition ${
              tab === key
                ? "border-brand font-medium text-text"
                : "border-transparent text-muted hover:text-dim"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "comments" ? (
        <div className="space-y-4">
          {task.comments.length === 0 && (
            <p className="text-[12px] text-faint">Nenhum comentário ainda.</p>
          )}
          {task.comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar name={c.author.name} color={c.author.avatarColor} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[12px] font-medium">{c.author.name}</span>
                  <span className="text-[10px] text-faint">
                    {formatRelativeShort(new Date(c.createdAt))}
                  </span>
                </div>
                <div
                  className="rich mt-0.5 text-[13px] leading-relaxed text-dim"
                  dangerouslySetInnerHTML={{ __html: renderRich(c.body) }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {task.activities.map((a) => (
            <div key={a.id} className="flex items-start gap-2 text-[12px]">
              <Avatar name={a.actor.name} color={a.actor.avatarColor} size="xs" />
              <p className="text-muted">
                <span className="font-medium text-dim">{a.actor.name}</span>{" "}
                {describeActivity(a.type, a.meta)}
                <span className="text-faint">
                  {" · "}
                  {formatRelativeShort(new Date(a.createdAt))}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Caixa de comentário fixa                                                    */
/* -------------------------------------------------------------------------- */

function CommentBox({
  taskId,
  mutate,
}: {
  taskId: string;
  mutate: (fn: () => Promise<unknown>) => void;
}) {
  const { currentUser } = useAppContext();
  const [body, setBody] = useState("");

  function send() {
    const text = body.trim();
    if (!text) return;
    setBody("");
    mutate(() => addComment(taskId, text));
  }

  return (
    <div className="shrink-0 border-t border-line bg-graphite p-3">
      <div className="flex gap-2.5">
        <Avatar name={currentUser.name} color={currentUser.avatarColor} size="md" />
        <div className="flex-1">
          <textarea
            value={body}
            rows={2}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Comentar…  (use @nome para mencionar · Ctrl+Enter envia)"
            className="w-full resize-none rounded-md border border-line bg-surface px-3 py-2 text-[13px] outline-none transition focus:border-brand placeholder:text-faint"
          />
          <div className="mt-1.5 flex justify-end">
            <button className="btn-primary py-1.5 text-[12px]" onClick={send} disabled={!body.trim()}>
              Comentar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
