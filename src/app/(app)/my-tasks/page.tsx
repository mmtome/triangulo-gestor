import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { myTasks } from "@/lib/simple-tasks";
import { SimpleTaskList } from "@/components/task/SimpleTaskList";
import { dueBucket, DUE_BUCKET_LABEL, DUE_BUCKET_ORDER, type DueBucket } from "@/lib/dates";

export default async function MyTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const user = await requireUser();
  const { done } = await searchParams;
  const showCompleted = done === "1";

  const tasks = await myTasks(user.id, showCompleted);

  const groups = new Map<DueBucket, typeof tasks>();
  for (const t of tasks) {
    const b = dueBucket(t.dueAt ? new Date(t.dueAt) : null, t.completed);
    groups.set(b, [...(groups.get(b) ?? []), t]);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Minhas tarefas</h1>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Tudo onde você é responsável — inclusive subtarefas do fluxo de produção.
          </p>
        </div>
        <Link
          href={showCompleted ? "/my-tasks" : "/my-tasks?done=1"}
          className="btn-ghost py-1.5 text-[12px]"
        >
          {showCompleted ? "Ocultar concluídas" : "Mostrar concluídas"}
        </Link>
      </div>

      {tasks.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-[13px] text-muted">Nenhuma tarefa atribuída a você.</p>
          <p className="mt-1 text-[12px] text-faint">
            Todo atrito é lucro escapando — mas hoje a sua fila está limpa.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {DUE_BUCKET_ORDER.map((bucket) => {
          const list = groups.get(bucket);
          if (!list?.length) return null;
          return (
            <section key={bucket}>
              <h2
                className={`mb-2 text-[12px] font-semibold uppercase tracking-wider ${
                  bucket === "overdue" ? "text-brand" : "text-faint"
                }`}
              >
                {DUE_BUCKET_LABEL[bucket]}{" "}
                <span className="font-normal text-faint">{list.length}</span>
              </h2>
              <SimpleTaskList tasks={list} />
            </section>
          );
        })}
      </div>
    </div>
  );
}
