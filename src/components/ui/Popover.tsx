"use client";

import { useEffect, useRef, useState } from "react";

/** Dropdown ancorado, com fechamento por clique fora e Esc. */
export function Popover({
  trigger,
  children,
  align = "left",
  width = "w-64",
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  children: (props: { close: () => void }) => React.ReactNode;
  align?: "left" | "right";
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          className={`card absolute z-40 mt-1 ${width} ${
            align === "right" ? "right-0" : "left-0"
          } overflow-hidden shadow-2xl animate-fade`}
        >
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}
