"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Filter, ArrowUpDown, Group, Search, Plus, Check } from "lucide-react";
import { Popover } from "@/components/ui/Popover";
import { Avatar } from "@/components/ui/Avatar";
import { saveViewPreference } from "@/actions/view";
import type { ViewFilters } from "@/lib/view-filters";
import type { ViewType } from "@/lib/enums";
import type { ContextUser } from "@/components/layout/AppContext";

export type TagLite = { id: string; name: string; color: string };

const SORTS = [
  { key: "manual", label: "Manual (arrastar)" },
  { key: "dueAt", label: "Data de conclusão" },
  { key: "title", label: "Título" },
  { key: "assignee", label: "Responsável" },
];

const GROUPS = [
  { key: "section", label: "Seção" },
  { key: "assignee", label: "Responsável" },
  { key: "none", label: "Nenhum" },
];

export function ViewToolbar({
  projectId,
  viewType,
  filters,
  sortBy,
  groupBy,
  users,
  tags,
  query,
  onQuery,
  onAddTask,
  showSort = true,
  showGroup = true,
}: {
  projectId: string;
  viewType: ViewType;
  filters: ViewFilters;
  sortBy: string;
  groupBy: string;
  users: ContextUser[];
  tags: TagLite[];
  query: string;
  onQuery: (q: string) => void;
  onAddTask?: () => void;
  showSort?: boolean;
  showGroup?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const save = (patch: {
    filters?: ViewFilters;
    sortBy?: string | null;
    groupBy?: string | null;
  }) =>
    start(async () => {
      await saveViewPreference({ projectId, viewType, ...patch });
      router.refresh();
    });

  const activeFilters =
    (filters.incomplete ? 0 : 1) +
    (filters.assigneeIds?.length ?? 0) +
    (filters.tagIds?.length ?? 0);

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-line px-5 py-2">
      {onAddTask && (
        <button className="btn-ghost py-1 text-[12px]" onClick={onAddTask}>
          <Plus className="h-3.5 w-3.5" />
          Adicionar tarefa
        </button>
      )}

      {/* ---- Filtrar ---- */}
      <Popover
        width="w-64"
        trigger={({ toggle }) => (
          <button className="btn-ghost py-1 text-[12px]" onClick={toggle}>
            <Filter className="h-3.5 w-3.5" />
            Filtrar
            {activeFilters > 0 && (
              <span className="rounded-full bg-brand px-1.5 text-[10px] font-semibold text-white">
                {activeFilters}
              </span>
            )}
          </button>
        )}
      >
        {() => (
          <div className="py-1">
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition hover:bg-surface"
              onClick={() => save({ filters: { ...filters, incomplete: !filters.incomplete } })}
            >
              <span
                className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${
                  filters.incomplete ? "border-brand bg-brand" : "border-faint"
                }`}
              >
                {filters.incomplete && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
              </span>
              Somente por concluir
            </button>

            <div className="mt-1 border-t border-line px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-faint">
              Responsável
            </div>
            <div className="max-h-40 overflow-y-auto">
              {users.map((u) => {
                const on = filters.assigneeIds?.includes(u.id) ?? false;
                return (
                  <button
                    key={u.id}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition hover:bg-surface"
                    onClick={() =>
                      save({
                        filters: {
                          ...filters,
                          assigneeIds: on
                            ? (filters.assigneeIds ?? []).filter((id) => id !== u.id)
                            : [...(filters.assigneeIds ?? []), u.id],
                        },
                      })
                    }
                  >
                    <Avatar name={u.name} color={u.avatarColor} size="xs" />
                    <span className="flex-1 truncate">{u.name}</span>
                    {on && <Check className="h-3 w-3 text-ok" />}
                  </button>
                );
              })}
            </div>

            {tags.length > 0 && (
              <>
                <div className="mt-1 border-t border-line px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-faint">
                  Tag
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {tags.map((t) => {
                    const on = filters.tagIds?.includes(t.id) ?? false;
                    return (
                      <button
                        key={t.id}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition hover:bg-surface"
                        onClick={() =>
                          save({
                            filters: {
                              ...filters,
                              tagIds: on
                                ? (filters.tagIds ?? []).filter((id) => id !== t.id)
                                : [...(filters.tagIds ?? []), t.id],
                            },
                          })
                        }
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: t.color }}
                        />
                        <span className="flex-1 truncate">{t.name}</span>
                        {on && <Check className="h-3 w-3 text-ok" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {activeFilters > 0 && (
              <button
                className="mt-1 w-full border-t border-line px-3 py-2 text-left text-[12px] text-brand transition hover:bg-surface"
                onClick={() =>
                  save({ filters: { incomplete: true, assigneeIds: [], tagIds: [] } })
                }
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </Popover>

      {/* ---- Ordenar ---- */}
      {showSort && (
        <Popover
          width="w-52"
          trigger={({ toggle }) => (
            <button className="btn-ghost py-1 text-[12px]" onClick={toggle}>
              <ArrowUpDown className="h-3.5 w-3.5" />
              {SORTS.find((s) => s.key === sortBy)?.label ?? "Ordenar"}
            </button>
          )}
        >
          {({ close }) => (
            <div className="py-1">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[12px] transition hover:bg-surface"
                  onClick={() => {
                    close();
                    save({ sortBy: s.key });
                  }}
                >
                  {s.label}
                  {sortBy === s.key && <Check className="h-3 w-3 text-ok" />}
                </button>
              ))}
            </div>
          )}
        </Popover>
      )}

      {/* ---- Agrupar ---- */}
      {showGroup && (
        <Popover
          width="w-48"
          trigger={({ toggle }) => (
            <button className="btn-ghost py-1 text-[12px]" onClick={toggle}>
              <Group className="h-3.5 w-3.5" />
              {GROUPS.find((g) => g.key === groupBy)?.label ?? "Agrupar"}
            </button>
          )}
        >
          {({ close }) => (
            <div className="py-1">
              {GROUPS.map((g) => (
                <button
                  key={g.key}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[12px] transition hover:bg-surface"
                  onClick={() => {
                    close();
                    save({ groupBy: g.key });
                  }}
                >
                  {g.label}
                  {groupBy === g.key && <Check className="h-3 w-3 text-ok" />}
                </button>
              ))}
            </div>
          )}
        </Popover>
      )}

      <div className="relative ml-auto">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Filtrar nesta visão…"
          className="w-52 rounded-md border border-line bg-surface py-1 pl-8 pr-2 text-[12px] outline-none transition placeholder:text-faint focus:border-brand"
        />
      </div>

      {pending && <span className="text-[11px] text-faint">salvando…</span>}
    </div>
  );
}
