"use client";

import { useState } from "react";
import { X, Search, Plus } from "lucide-react";
import { Popover } from "@/components/ui/Popover";
import { Avatar, AvatarEmpty } from "@/components/ui/Avatar";
import { formatDue, toDateInput, toTimeInput, composeDue } from "@/lib/dates";
import { PALETTE } from "@/lib/enums";
import type { ContextUser } from "@/components/layout/AppContext";

/* -------------------------------------------------------------------------- */
/* Responsável                                                                 */
/* -------------------------------------------------------------------------- */

export function AssigneePicker({
  value,
  users,
  onChange,
  compact = false,
}: {
  value: { id: string; name: string; avatarColor: string } | null;
  users: ContextUser[];
  onChange: (userId: string | null) => void;
  compact?: boolean;
}) {
  const [q, setQ] = useState("");
  const filtered = users.filter((u) => u.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Popover
      width="w-60"
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className={`flex items-center gap-2 rounded-md px-1.5 py-1 text-left text-[13px] transition hover:bg-surface ${
            compact ? "" : "w-full"
          }`}
        >
          {value ? (
            <>
              <Avatar name={value.name} color={value.avatarColor} size="sm" />
              {!compact && <span className="truncate">{value.name}</span>}
            </>
          ) : (
            <>
              <AvatarEmpty size="sm" />
              {!compact && <span className="text-faint">Sem responsável</span>}
            </>
          )}
        </button>
      )}
    >
      {({ close }) => (
        <div>
          <div className="relative border-b border-line">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar pessoa…"
              className="w-full bg-transparent py-2 pl-9 pr-3 text-[13px] outline-none placeholder:text-faint"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-faint transition hover:bg-surface"
              onClick={() => {
                onChange(null);
                close();
              }}
            >
              <AvatarEmpty size="sm" />
              Sem responsável
            </button>
            {filtered.map((u) => (
              <button
                key={u.id}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition hover:bg-surface"
                onClick={() => {
                  onChange(u.id);
                  close();
                }}
              >
                <Avatar name={u.name} color={u.avatarColor} size="sm" />
                <span className="truncate">{u.name}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-xs text-faint">Ninguém encontrado.</p>
            )}
          </div>
        </div>
      )}
    </Popover>
  );
}

/* -------------------------------------------------------------------------- */
/* Prazo (data + hora opcional)                                                */
/* -------------------------------------------------------------------------- */

export function DueDatePicker({
  dueAt,
  hasTime,
  overdue,
  onChange,
}: {
  dueAt: Date | null;
  hasTime: boolean;
  overdue?: boolean;
  onChange: (iso: string | null, hasTime: boolean) => void;
}) {
  return (
    <Popover
      width="w-64"
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className={`w-full rounded-md px-1.5 py-1 text-left text-[13px] transition hover:bg-surface ${
            overdue ? "text-brand" : dueAt ? "text-text" : "text-faint"
          }`}
        >
          {dueAt ? formatDue(dueAt, hasTime) : "Sem prazo"}
        </button>
      )}
    >
      {({ close }) => {
        const date = toDateInput(dueAt);
        const time = hasTime ? toTimeInput(dueAt) : "";
        return (
          <div className="p-3">
            <label className="mb-1 block text-[11px] font-medium text-dim">Data</label>
            <input
              type="date"
              defaultValue={date}
              className="field py-1.5"
              onChange={(e) => {
                if (!e.target.value) return onChange(null, false);
                onChange(composeDue(e.target.value, time || null).toISOString(), !!time);
              }}
            />
            <label className="mb-1 mt-3 block text-[11px] font-medium text-dim">
              Hora (opcional)
            </label>
            <input
              type="time"
              defaultValue={time}
              disabled={!date}
              className="field py-1.5"
              onChange={(e) => {
                if (!date) return;
                onChange(composeDue(date, e.target.value || null).toISOString(), !!e.target.value);
              }}
            />
            <div className="mt-3 flex justify-between">
              <button
                className="text-[12px] text-faint transition hover:text-brand"
                onClick={() => {
                  onChange(null, false);
                  close();
                }}
              >
                Limpar prazo
              </button>
              <button className="text-[12px] text-dim transition hover:text-text" onClick={close}>
                Pronto
              </button>
            </div>
          </div>
        );
      }}
    </Popover>
  );
}

/* -------------------------------------------------------------------------- */
/* Tags                                                                        */
/* -------------------------------------------------------------------------- */

export type TagLite = { id: string; name: string; color: string };

export function TagPill({
  tag,
  onRemove,
  size = "md",
}: {
  tag: TagLite;
  onRemove?: () => void;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${
        size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
      }`}
      style={{ backgroundColor: `${tag.color}26`, color: tag.color }}
    >
      {tag.name}
      {onRemove && (
        <button onClick={onRemove} className="transition hover:opacity-70" aria-label="Remover tag">
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

export function TagPicker({
  selected,
  available,
  onChange,
  onCreate,
}: {
  selected: TagLite[];
  available: TagLite[];
  onChange: (tagIds: string[]) => void;
  onCreate?: (name: string, color: string) => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const selectedIds = selected.map((t) => t.id);
  const filtered = available.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));
  const canCreate = q.trim().length > 0 && !available.some((t) => t.name.toLowerCase() === q.trim().toLowerCase());

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selected.map((t) => (
        <TagPill
          key={t.id}
          tag={t}
          onRemove={() => onChange(selectedIds.filter((id) => id !== t.id))}
        />
      ))}
      <Popover
        width="w-56"
        trigger={({ toggle }) => (
          <button
            onClick={toggle}
            className="rounded-full border border-dashed border-faint px-2 py-0.5 text-[10px] text-faint transition hover:border-brand hover:text-brand"
          >
            + tag
          </button>
        )}
      >
        {() => (
          <div>
            <div className="border-b border-line">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar ou criar…"
                className="w-full bg-transparent px-3 py-2 text-[13px] outline-none placeholder:text-faint"
              />
            </div>
            <div className="max-h-52 overflow-y-auto py-1">
              {filtered.map((t) => {
                const on = selectedIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition hover:bg-surface"
                    onClick={() =>
                      onChange(on ? selectedIds.filter((id) => id !== t.id) : [...selectedIds, t.id])
                    }
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="flex-1 truncate text-[13px]">{t.name}</span>
                    {on && <span className="text-[10px] text-ok">✓</span>}
                  </button>
                );
              })}
              {canCreate && onCreate && (
                <button
                  className="flex w-full items-center gap-2 border-t border-line px-3 py-2 text-left text-[13px] text-brand transition hover:bg-surface"
                  onClick={async () => {
                    await onCreate(
                      q.trim(),
                      PALETTE[Math.floor(Math.random() * PALETTE.length)],
                    );
                    setQ("");
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Criar “{q.trim()}”
                </button>
              )}
              {filtered.length === 0 && !canCreate && (
                <p className="px-3 py-2 text-xs text-faint">Nenhuma tag.</p>
              )}
            </div>
          </div>
        )}
      </Popover>
    </div>
  );
}
