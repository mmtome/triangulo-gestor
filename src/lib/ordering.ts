// Rank fracionado lexicográfico (seção 3.3.1 da spec).
// Permite inserir entre dois itens sem reescrever a ordem de todas as linhas.
//
// Alfabeto base-62 ordenável por comparação de string simples.

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const FIRST = ALPHABET[0];
const LAST = ALPHABET[ALPHABET.length - 1];

function charIndex(s: string, i: number): number {
  if (i >= s.length) return -1;
  return ALPHABET.indexOf(s[i]);
}

/**
 * Retorna uma chave estritamente entre `a` e `b`.
 * `a` = null significa "início da lista"; `b` = null significa "fim da lista".
 */
export function between(a: string | null, b: string | null): string {
  if (a && b && a >= b) {
    throw new Error(`ordering.between: chaves fora de ordem (${a} >= ${b})`);
  }

  let prefix = "";
  let i = 0;

  for (;;) {
    const ai = a ? charIndex(a, i) : -1;
    const bi = b ? charIndex(b, i) : ALPHABET.length;

    if (bi - ai > 1) {
      // Há espaço entre os dois caracteres nesta posição.
      const mid = Math.floor((ai + bi) / 2);
      return prefix + ALPHABET[mid];
    }

    // Sem espaço: fixa o caractere de `a` (ou o primeiro) e avança uma posição.
    prefix += ai >= 0 ? ALPHABET[ai] : FIRST;
    i++;

    if (a && i >= a.length && !b) {
      return prefix + ALPHABET[Math.floor(ALPHABET.length / 2)];
    }
  }
}

/** Gera N chaves iniciais igualmente espaçadas (uso em seed e criação de projeto). */
export function initialOrders(count: number): string[] {
  const out: string[] = [];
  let prev: string | null = null;
  for (let i = 0; i < count; i++) {
    prev = between(prev, null);
    out.push(prev);
  }
  return out;
}

/** Chave para acrescentar ao fim de uma lista já ordenada. */
export function appendAfter(last: string | null): string {
  return between(last, null);
}

/**
 * Comparador das chaves de ordem.
 *
 * NÃO use String.localeCompare aqui: a colação linguística ignora caixa e
 * ordenaria "k" antes de "U", quebrando o rank base-62. O banco compara os
 * mesmos valores por byte (BINARY), então o cliente precisa fazer igual — senão
 * a lista renderiza numa ordem diferente da que foi gravada.
 */
export function compareOrder(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export const ORDER_FIRST = FIRST;
export const ORDER_LAST = LAST;
