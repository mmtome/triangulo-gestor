import "server-only";
import { revalidatePath } from "next/cache";

/**
 * O drawer de tarefa é global (abre sobre qualquer visão) e uma tarefa pode
 * estar em vários projetos ao mesmo tempo — invalidar caminhos específicos
 * deixaria listas paralelas defasadas. Para um app interno de 1 a 5 usuários,
 * invalidar o layout inteiro é o comportamento correto e mais barato de manter.
 */
export function refreshAll() {
  revalidatePath("/", "layout");
}
