/**
 * Formatação leve para descrições e comentários.
 *
 * A spec (seção 3.1) previa Tiptap. Optamos por um formatador próprio: o texto
 * é guardado em plain text — legível no banco, fácil de buscar e sem risco de
 * HTML injetado — e só a exibição aplica **negrito**, _itálico_, links, listas
 * e quebras de linha. Trocar por um editor rico depois não exige migração de
 * dados: basta passar a guardar HTML e remover este render.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderRich(input: string | null | undefined): string {
  if (!input) return "";

  const lines = escapeHtml(input).split(/\r?\n/);
  const out: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (/^\s*[-•*]\s+/.test(line)) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(line.replace(/^\s*[-•*]\s+/, ""))}</li>`);
      continue;
    }

    closeList();
    if (line.trim() === "") out.push("<p></p>");
    else out.push(`<p>${inline(line)}</p>`);
  }
  closeList();

  return out.join("");
}

function inline(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|\s)_([^_]+)_/g, "$1<em>$2</em>")
    .replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
    )
    .replace(/@([\wÀ-ÿ.]+)/g, '<span class="text-brand font-medium">@$1</span>');
}

/** Prévia em uma linha (usada em cards e resultados de busca). */
export function plainPreview(input: string | null | undefined, max = 120): string {
  if (!input) return "";
  const t = input.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}
