// Símbolo oficial da Triângulo Solucions (assets/SIMBOLO.svg do Manual da Marca).
// Inline em vez de <img> para herdar a cor por currentColor e evitar request extra.

export function Symbol({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 234.59 254.66" className={className} aria-hidden="true" fill="currentColor">
      <path d="M227.04,89.41l-104.87-41.33-.12-45.49c0-1.97-2.72-2.8-4.41-2.54L7.72,43.92C3.35,45.66.08,49.57.07,54.53l-.07,99.37c0,4.74,2.54,9.33,7.18,11.16l105.2,41.52.18,44.5c0,1.27.95,2.59,1.64,3.07.67.46,2.23.73,3.3.3l109.39-43.68c3.59-1.43,7.41-4.78,7.43-8.4l.23-47.15.04-54.9c0-4.91-2.99-9.11-7.55-10.91ZM220.2,152.81l-97.97,37.89-.14-39.37c-.01-1.94-1.73-3.33-3.38-4.19L15.49,107.41c-1.65-.63-2.64-1.29-3.27-2.93.52-1.15,1.28-2.2,2.73-2.76l97.43-37.7.17,39.26c0,2.27,2.14,3.83,4.13,4.58l103.85,39.96c1.12.43,1.47,2.24,1.73,2.94-.44,1.13-1.01,1.48-2.06,2.05Z" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Symbol className="h-6 w-6 shrink-0 text-brand" />
      {!compact && (
        <div className="leading-none">
          <div className="text-[13px] font-semibold tracking-tight text-text">
            Triângulo <span className="text-brand">Gestor</span>
          </div>
          <div className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-faint">
            Mapear · Resolver · Lucrar
          </div>
        </div>
      )}
    </div>
  );
}
