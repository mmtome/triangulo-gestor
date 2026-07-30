"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { formatRelativeShort } from "@/lib/dates";
import { markRead, markAllRead } from "@/actions/notification";

type Item = {
  id: string;
  read: boolean;
  createdAt: string;
  taskId: string | null;
  label: string;
  taskTitle: string;
  actor: { id: string; name: string; avatarColor: string };
};

export function InboxFeed({ items, onlyUnread }: { items: Item[]; onlyUnread: boolean }) {
  const router = useRouter();
  const [, start] = useTransition();

  return (
    <>
      <div className="mb-4 mt-4 flex items-center gap-2">
        <Link
          href="/inbox"
          className={`rounded-md border px-3 py-1 text-[12px] transition ${
            onlyUnread ? "border-brand bg-brand-soft text-text" : "border-line text-muted"
          }`}
        >
          Não lidas
        </Link>
        <Link
          href="/inbox?tab=all"
          className={`rounded-md border px-3 py-1 text-[12px] transition ${
            !onlyUnread ? "border-brand bg-brand-soft text-text" : "border-line text-muted"
          }`}
        >
          Todas
        </Link>
        <button
          className="btn-ghost ml-auto py-1 text-[12px]"
          onClick={() =>
            start(async () => {
              await markAllRead();
              router.refresh();
            })
          }
        >
          Marcar todas como lidas
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card p-8 text-center text-[13px] text-muted">
          Nada por ler. Caixa limpa.
        </div>
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {items.map((n) => (
            <button
              key={n.id}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-surface ${
                n.read ? "opacity-60" : ""
              }`}
              onClick={() =>
                start(async () => {
                  await markRead([n.id]);
                  if (n.taskId) router.push(`/my-tasks?task=${n.taskId}`);
                  else router.refresh();
                })
              }
            >
              {!n.read && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
              {n.read && <span className="mt-2 h-1.5 w-1.5 shrink-0" />}
              <Avatar name={n.actor.name} color={n.actor.avatarColor} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-dim">
                  <span className="font-medium text-text">{n.actor.name}</span> {n.label}{" "}
                  <span className="font-medium text-text">{n.taskTitle}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-faint">
                  {formatRelativeShort(new Date(n.createdAt))}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
