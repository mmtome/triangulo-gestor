"use client";

import { Check } from "lucide-react";

/** Check circular das visões — verde ao concluir (seção 5.7 da spec). */
export function CheckCircle({
  completed,
  onToggle,
  size = "md",
  disabled,
}: {
  completed: boolean;
  onToggle: () => void;
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  const box = size === "sm" ? "h-[15px] w-[15px]" : "h-[18px] w-[18px]";
  const icon = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={completed ? "Reabrir tarefa" : "Concluir tarefa"}
      title={completed ? "Reabrir tarefa" : "Concluir tarefa"}
      className={`${box} flex shrink-0 items-center justify-center rounded-full border transition ${
        completed
          ? "border-ok bg-ok text-white"
          : "border-faint text-transparent hover:border-ok hover:text-ok"
      } disabled:opacity-40`}
    >
      <Check className={icon} strokeWidth={3} />
    </button>
  );
}
