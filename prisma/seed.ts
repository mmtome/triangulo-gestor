/**
 * Seed do Triângulo Gestor.
 *
 * Carrega o PLANEJAMENTO DE CONTEÚDO · INSTAGRAM (ciclo 1 — agosto/2026) como
 * projeto real: os 4 tipos de conteúdo viram tags, as 4 semanas viram seções,
 * cada post vira uma tarefa com o fluxo de produção completo em subtarefas, e
 * o banco de pautas entra como backlog.
 *
 * Rodar:  npm run db:seed   (apaga e recria os dados de exemplo)
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { initialOrders, between } from "../src/lib/ordering";

const db = new PrismaClient();

/* -------------------------------------------------------------------------- */
/* helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** Data local de 2026 no formato (dia, mês, hora, minuto). */
const d = (day: number, month: number, hour = 18, minute = 0) =>
  new Date(2026, month - 1, day, hour, minute, 0, 0);

class Order {
  private last: string | null = null;
  next() {
    this.last = between(this.last, null);
    return this.last;
  }
}

/* -------------------------------------------------------------------------- */
/* conteúdo do planejamento                                                    */
/* -------------------------------------------------------------------------- */

type Kind = "ALCANCE" | "AUTORIDADE" | "RELACIONAMENTO" | "VENDAS";

type Post = {
  title: string;
  kind: Kind;
  format: "REELS" | "CARROSSEL" | "ESTÁTICO" | "STORIES";
  ritual?: string;
  week: number;
  date: Date;
  owner: "estrategia" | "social";
  description: string;
  estimatedMinutes: number;
  template: boolean;
};

const POSTS: Post[] = [
  /* ------------------------------- Semana 1 ------------------------------- */
  {
    title: "Sua empresa não tem problema de venda. Tem vazamento.",
    kind: "ALCANCE",
    format: "ESTÁTICO",
    week: 1,
    date: d(3, 8),
    owner: "estrategia",
    estimatedMinutes: 45,
    template: true,
    description: `**SEM GRAVAÇÃO — post de arte única.** A frase carrega o post; não precisa de
vídeo para funcionar.

**Arte:** fundo preto, a frase em Poppins bold ocupando o quadro, símbolo da
Triângulo pequeno no canto. O motivo de "mapa de processo" entra como textura
sutil ao fundo.

**Texto na arte:**
"Você não precisa vender mais pra lucrar mais.
Você precisa parar de perder."

**Legenda:** desenvolve as três perdas — processo manual, retrabalho e gargalo —
em frases curtas, e fecha com "Todo atrito é lucro escapando".

**CTA:** Marca aqui o sócio que só fala em vender mais.

**Pilar:** Mentalidade de Dono / Lucro.
**Métrica-rainha:** % de contas não seguidoras (meta > 50%).`,
  },
  {
    title: "Raio-X de Processo #01 — O orçamento que demora 3 dias pra sair",
    kind: "AUTORIDADE",
    format: "CARROSSEL",
    ritual: "RAIO-X DE PROCESSO",
    week: 1,
    date: d(5, 8),
    owner: "estrategia",
    estimatedMinutes: 150,
    template: true,
    description: `**Estrutura do carrossel (8 cards):**
1. Gancho — "O orçamento da sua empresa demora 3 dias. Por quê?"
2-5. Desenha o fluxo real: pedido › planilha › aprovação por WhatsApp › refazer.
6. Marca o gargalo exato.
7. O custo em horas/mês.
8. O que mudaria com o processo destravado.

**CTA:** Salva. Semana que vem tem Raio-X novo.

**Pilar:** Diagnóstico & Processos.
**Métrica-rainha:** salvamentos (meta > 3% do alcance).

**Amarração editorial:** este post arma o caso da FN Cortinas, que fecha o mês
em 31/08. Aqui a gente ensina a enxergar o gargalo do orçamento; lá mostra ele
resolvido num cliente real. Não citar a FN ainda — deixar a virada para o dia 31.`,
  },
  {
    title: "Por que a gente fundou a Triângulo (Creation Story)",
    kind: "RELACIONAMENTO",
    format: "CARROSSEL",
    week: 1,
    date: d(7, 8),
    owner: "estrategia",
    estimatedMinutes: 120,
    template: true,
    description: `**SEM GRAVAÇÃO — carrossel com foto.** A Creation Story pede rosto, mas rosto
em foto resolve: uma boa foto dos sócios no card 1 e o texto nos seguintes.
Quando houver estrutura de vídeo, este é o primeiro post a virar Reels.

**Estrutura (6 cards):**
1. Foto dos sócios + "Por que a gente fundou a Triângulo"
2-4. A cena que se repetia: empresas afogadas em processo manual enquanto o
   mercado vendia site bonito e projeto de IA
5. O estalo: falta ao digital o que a engenharia de produção ensina — mapear,
   medir, otimizar
6. CTA

**CTA:** Se isso parece a sua empresa, comenta "MAPA".

**BLOQUEIO:** a Creation Story do documento de branding ainda é um modelo.
Antes de publicar, fechar os fatos reais — quantos sócios, onde se conheceram e
qual caso deu o estalo.

**Trava de marca:** nunca dizer "somos engenheiros". Sempre "método da
engenharia de produção".`,
  },

  {
    title: "Sem Hype #01 — IA não vai salvar a sua empresa",
    kind: "ALCANCE",
    format: "CARROSSEL",
    ritual: "SEM HYPE",
    week: 1,
    date: d(9, 8),
    owner: "estrategia",
    estimatedMinutes: 120,
    template: true,
    description: `**SEM GRAVAÇÃO — carrossel de 6 cards com a virada no card 2.**

**Gancho (card 1):** Se a sua operação está quebrada, IA só vai te fazer errar mais rápido.

**Desenvolvimento:** IA é meio, não milagre. Automatizar um processo ruim é
multiplicar o problema. A ordem certa: mapear › corrigir › só então automatizar.

**CTA:** Compartilha com quem tá prestes a gastar dinheiro em IA.

**Post de maior potencial de alcance do ciclo — vale impulsionar.**
**Pilar:** Tecnologia com Propósito / IA sem Hype.`,
  },
  {
    title: "O que é um gargalo — e como achar o seu em 15 minutos",
    kind: "AUTORIDADE",
    format: "CARROSSEL",
    week: 2,
    date: d(11, 8),
    owner: "estrategia",
    estimatedMinutes: 150,
    template: true,
    description: `**Método em 4 passos, em linguagem de dono:**
- Onde a fila acumula
- Onde alguém espera
- Onde o trabalho volta
- Onde tem retrabalho

Encerrar com: "o gargalo manda no ritmo da empresa inteira".

**CTA:** Salva e faz esse teste na sua operação essa semana.`,
  },
  {
    title: "Nenhuma linha de código antes de entender onde está o seu lucro",
    kind: "VENDAS",
    format: "CARROSSEL",
    week: 2,
    date: d(13, 8),
    owner: "estrategia",
    estimatedMinutes: 120,
    template: true,
    description: `**Vende O Mapa** — a sessão de diagnóstico, rito de entrada da marca.

**Carrossel (6 cards):** o que é a sessão · o que o cliente recebe (mapa do
processo + pontos de vazamento + tese de lucro) · quanto tempo leva · para quem
serve · para quem NÃO serve · CTA.

**CTA:** Solicitar diagnóstico — link na bio ou chama no WhatsApp.

**Regra de posicionamento:** o que se vende no Instagram é O Mapa, não o
software. Vender software direto quebra a promessa da marca.

**Prova disponível:** se precisar de um exemplo concreto no card 5, usar a FN
Cortinas — o app dela nasceu de um mapeamento do processo de orçamento, não de
um briefing de "quero um sistema". É exatamente a promessa cumprida.

**Coletar o "antes" na sessão.** A FN ensinou isso do jeito difícil: sem medir
o tempo e o erro no dia do Mapa, o caso fica sem número depois. Incluir a
medição no roteiro da sessão.`,
  },

  /* ------------------------------- Semana 3 ------------------------------- */
  {
    title: "Faturar mais nem sempre é lucrar mais",
    kind: "ALCANCE",
    format: "REELS",
    week: 3,
    date: d(17, 8),
    owner: "estrategia",
    estimatedMinutes: 90,
    template: true,
    description: `**Gancho:** Tem empresa batendo recorde de faturamento e ganhando menos que ano passado.

**Desenvolvimento:** crescer sem controle é multiplicar o desperdício. Fatura
sobe, operação trava, margem some.

**CTA:** Salva pra mostrar na próxima reunião de resultado.`,
  },
  {
    title: "Raio-X de Processo #02 — A planilha compartilhada",
    kind: "AUTORIDADE",
    format: "CARROSSEL",
    ritual: "RAIO-X DE PROCESSO",
    week: 3,
    date: d(19, 8),
    owner: "estrategia",
    estimatedMinutes: 150,
    template: true,
    description: `**Os 3 sinais de que um processo manual está custando caro:**
- Alguém "confere" o que outro já fez
- A informação existe em dois lugares
- A resposta depende de uma pessoa específica

Fecha com a conta em horas/mês.

**CTA:** Salva. Comenta qual desses 3 acontece aí.`,
  },
  {
    title: "Como a gente trabalha: entrega em ciclos, nada de caixa-preta",
    kind: "RELACIONAMENTO",
    format: "REELS",
    week: 2,
    date: d(15, 8),
    owner: "social",
    estimatedMinutes: 100,
    template: true,
    description: `**Bastidor:** mostrar o ritual — sprints curtos, cliente vendo evoluir, tela
real, quadro, reunião. Contrapor à consultoria de PowerPoint.

**CTA:** Já contratou alguém que sumiu depois do contrato? Conta nos comentários.

**Pilar:** ritual "Entrega em ciclos" do Primal Branding.`,
  },
  {
    title: "Demonstração: a calculadora de orçamento da FN Cortinas",
    kind: "VENDAS",
    format: "CARROSSEL",
    week: 3,
    date: d(21, 8),
    owner: "social",
    estimatedMinutes: 120,
    template: true,
    description: `**Prova antes da oferta.** Este post começa a esquentar o caso que fecha o mês
em 31/08 — mostra a ferramenta funcionando sem ainda contar a história toda.

**Formato:** carrossel com prints de tela (print resolve; quando houver vídeo,
vira gravação de tela).

**Sequência:** medida da janela › modelo › tecido › forro › valor fechado ›
proposta pronta.

**Ponto alto para narrar:** o trilho duplo aparece sozinho quando entra blackout
ou forro não costurado. O vendedor não escolhe — o sistema sabe a regra.

**Fecho:** "isso não é um app de cortina. É o processo da FN virado software."

**CTA:** Quer o seu processo virando ferramenta? Chama no WhatsApp.`,
  },
  {
    title: "Por que a gente escolheu ficar em Uberaba",
    kind: "RELACIONAMENTO",
    format: "ESTÁTICO",
    week: 3,
    date: d(23, 8),
    owner: "estrategia",
    estimatedMinutes: 45,
    template: true,
    description: `**SEM GRAVAÇÃO — foto + legenda.** Post de pertencimento regional, que é o que
traz lead qualificado na região de atuação.

**Arte:** uma foto real da cidade ou do espaço de trabalho, tratada na paleta da
marca. Nada de banco de imagens.

**Legenda:** o argumento é de negócio, não de saudade — indústria e comércio do
Triângulo Mineiro têm operação de verdade travada em processo manual, e estar
perto de quem decide é vantagem competitiva.

**CTA:** De onde você tá lendo? Conta nos comentários.

**Hashtags locais obrigatórias neste post:** #uberaba #triangulomineiro`,
  },

  /* ------------------------------- Semana 4 ------------------------------- */
  {
    title: "Sem Hype #02 — Quando automatizar é jogar dinheiro fora",
    kind: "ALCANCE",
    format: "REELS",
    ritual: "SEM HYPE",
    week: 4,
    date: d(25, 8),
    owner: "estrategia",
    estimatedMinutes: 90,
    template: true,
    description: `**Os 3 casos em que a Triângulo NÃO automatiza:**
- Processo que vai mudar em 3 meses
- Volume baixo demais para pagar o projeto
- Processo que deveria simplesmente deixar de existir

**Bordão de fechamento:** "Se não dá lucro, a gente não faz."

**CTA:** Compartilha com quem te ofereceu automação essa semana.`,
  },
  {
    title: "O custo invisível do “sempre foi assim”",
    kind: "AUTORIDADE",
    format: "CARROSSEL",
    week: 4,
    date: d(27, 8),
    owner: "estrategia",
    estimatedMinutes: 150,
    template: true,
    description: `**Ensinar a precificar o desperdício.** Dar a fórmula pronta:

horas × custo/hora × frequência = R$/mês

E um exemplo numérico fechado.

**CTA:** Faz essa conta com o seu processo mais chato e me manda o resultado no direct.`,
  },
  {
    title: "As 12 taxas de maquininha que ninguém repassava",
    kind: "ALCANCE",
    format: "CARROSSEL",
    week: 4,
    date: d(29, 8),
    owner: "estrategia",
    estimatedMinutes: 120,
    template: true,
    description: `**Micro-caso da FN, dois dias antes do carrossel grande.** Serve de aquecimento
para o caso de 31/08 e funciona sozinho como post de alcance.

**Gancho:** Você está pagando a maquininha do seu cliente e nem sabe.

**Desenvolvimento:** cada faixa de parcelamento tem uma taxa diferente — são 12.
Sem sistema, a loja absorve a diferença sem perceber. A conta certa é
preço ÷ (1 − taxa): o cliente continua vendo "sem juros" e a margem para de
vazar.

**Por que é o gancho perfeito da marca:** isso é lucro preso, literalmente, com
número em cima. Não é opinião — é aritmética.

**CTA:** Salva e confere as suas taxas ainda essa semana.

**Pilar:** Mentalidade de Dono / Lucro.`,
  },
  {
    title: "Do Problema ao Lucro #01 — FN Cortinas: o orçamento que virou 3 toques",
    kind: "VENDAS",
    format: "CARROSSEL",
    ritual: "DO PROBLEMA AO LUCRO",
    week: 4,
    date: d(31, 8),
    owner: "estrategia",
    estimatedMinutes: 240,
    template: true,
    description: `**CASO REAL — FN Cortinas.** É o par prático do Raio-X #01 (05/08): lá a
gente ensina a enxergar o gargalo do orçamento; aqui mostra ele resolvido.

**Estrutura fixa do ritual (9 cards):**

**1. O problema.** Orçar uma cortina não é medir a janela e multiplicar por um
preço. Cada peça depende de uma cadeia de decisões encadeadas — e cada uma
delas pode custar a margem.

**2. O mapa que fizemos.** Desenhamos o processo real de orçamento da FN, do
atendimento ao fechamento. O que era "experiência do vendedor" virou regra
escrita:
- 1m de cortina pronta consome 3m de tecido (franzido 3×), 3m de entretela,
  22 rodízios e 1m de trilho
- mão de obra = R$16 × metros de tecido
- trilho duplo ou simples NÃO é escolha: é consequência (duplo quando há
  blackout ou forro não costurado)
- o corte do rolo muda a metragem — largura útil de 2,85m decide o caso, com
  bainha de 0,35m (0,30m no blackout)
- forro separado ×1,5 · blackout ×1,2
- instalação R$170 sem forro / R$220 com forro separado
- adicionais: +R$100 acima de 4,5m de altura (andaime), +R$100 motorizada

**3. Onde estava o vazamento.** Toda essa cadeia rodava na cabeça de quem
vendia, com papel e calculadora. Três consequências: orçamento demorado, erro
de metragem que come margem no silêncio, e o parcelado — 12 faixas de taxa de
maquininha — sendo absorvido pela loja em vez de repassado.

**4. A solução construída.** App próprio, offline-first:
- **Calculadora** com o motor de precificação — funções puras, a tela nunca
  calcula, então a regra é a mesma para todo mundo que orça
- **Proposta** gerada na hora, pronta para o cliente
- **Estoque** e **Registros** dos pedidos
- **Ajustes**: lucro, taxas, preços de tecido e fatores editáveis pelo dono —
  sem depender da gente para mudar um preço
- **Funciona sem internet.** Cortina se mede na casa do cliente, e sinal de
  celular não é garantido: as ações entram numa fila local e sincronizam
  sozinhas quando a rede volta

**5. Antes & Depois em números.** ⚠️ PREENCHER COM MEDIÇÃO REAL antes de
publicar: tempo médio do orçamento antes × depois, nº de orçamentos por dia,
erro de metragem por pedido, margem média. Já temos o "antes" documentado (os
pedidos manuais em papel) — falta cronometrar o "depois".

**6. A tese de lucro cumprida.** Escrever a partir dos números do card 5.

**CTA:** Quer o mesmo raio-X na sua operação? Chama no WhatsApp.

**Regra que não se quebra:** número inventado destrói a obsessão por ROI que
sustenta a marca. Sem medição, publicar só até o card 4 e transformar o 5 e o 6
em "estamos medindo — semana que vem tem número".`,
  },
];

/* --------------------------- Stories da semana --------------------------- */

// Com o feed em dia sim/dia não (ímpares de agosto), os stories ocupam os dias
// pares — o "dia não" nunca fica mudo.
const STORIES: { title: string; kind: Kind; date: Date; week: number; description: string }[] = [
  ...[
    { day: 4, week: 1 },
    { day: 12, week: 2 },
    { day: 20, week: 3 },
    { day: 28, week: 4 },
  ].map(({ day, week }, i) => ({
    title: `Pergunta de Engenharia #0${i + 1} — enquete nos stories`,
    kind: "RELACIONAMENTO" as Kind,
    date: d(day, 8, 11, 30),
    week,
    description: `Ritual semanal, sempre num "dia não" do feed. Uma provocação curta que faz o
dono repensar a própria operação, em formato de enquete + caixinha.

**Sem gravação** — enquete e caixinha são nativas do Instagram.

Sugestões de pergunta:
- Qual tarefa aí é feita 100% no braço?
- Quantas planilhas rodam a sua empresa hoje? (1–3 / 4–10 / perdi a conta)
- Quanto tempo leva pra você saber quanto lucrou no mês passado?

**Métrica-rainha:** respostas de stories (meta > 10/semana).`,
  })),
  ...[
    { day: 8, week: 1 },
    { day: 16, week: 2 },
    { day: 24, week: 3 },
    { day: 30, week: 4 },
  ].map(({ day, week }, i) => ({
    title: `Bastidor da semana #0${i + 1} — sprint acontecendo`,
    kind: "RELACIONAMENTO" as Kind,
    date: d(day, 8, 17, 30),
    week,
    description: `Ritual semanal, no outro "dia não". Sequência curta mostrando o trabalho
acontecendo: tela real, quadro, reunião de sprint, o momento em que o cliente vê
o dashboard pela primeira vez.

**Enquanto não houver estrutura de gravação:** montar com prints de tela, foto
do quadro e texto sobre fundo da marca. Story de bastidor funciona com imagem
parada — o que não pode é o dia ficar mudo.

Fecha sempre com uma pergunta direta para abrir DM.`,
  })),
];

/* ----------------------------- Banco de pautas ---------------------------- */

const BACKLOG: { title: string; kind: Kind; description?: string }[] = [
  // ALCANCE
  { title: "Seu maior concorrente não está lá fora. É a sua operação travada.", kind: "ALCANCE" },
  { title: "Sem Hype: Não, você não precisa de um app.", kind: "ALCANCE" },
  { title: "A gente não chuta. Triangula.", kind: "ALCANCE" },
  { title: "5 frases que todo dono fala antes de perder dinheiro", kind: "ALCANCE" },
  { title: "O site mais bonito da sua cidade pode estar vendendo menos que uma planilha", kind: "ALCANCE" },
  { title: "Sem Hype: ChatGPT na empresa — o que funciona e o que é teatro", kind: "ALCANCE" },
  { title: "Contratar mais gente quase nunca é a solução", kind: "ALCANCE" },
  { title: "Por que a maioria dos dashboards não é olhada por ninguém", kind: "ALCANCE" },
  { title: "Empresa pequena não precisa de sistema caro. Precisa de processo claro.", kind: "ALCANCE" },
  { title: "Todo atrito é lucro escapando — 6 atritos que todo negócio tem", kind: "ALCANCE" },

  // AUTORIDADE
  { title: "Raio-X de Processo — o processo de cobrança", kind: "AUTORIDADE" },
  { title: "Raio-X de Processo — fechamento de mês", kind: "AUTORIDADE" },
  { title: "Raio-X de Processo — atendimento no WhatsApp", kind: "AUTORIDADE" },
  { title: "Como mapear um processo numa folha de papel (o método em 5 passos)", kind: "AUTORIDADE" },
  { title: "Retrabalho: como medir quanto ele custa na sua empresa", kind: "AUTORIDADE" },
  { title: "Os 4 tipos de desperdício que aparecem em toda PME", kind: "AUTORIDADE" },
  { title: "Indicador bom x indicador inútil: como saber a diferença", kind: "AUTORIDADE" },
  { title: "Por onde começar quando tudo parece problema — critério de priorização", kind: "AUTORIDADE" },
  { title: "O que é uma tese de lucro e por que toda proposta deveria ter uma", kind: "AUTORIDADE" },
  { title: "Planilha, sistema pronto ou sob medida? A árvore de decisão", kind: "AUTORIDADE" },
  { title: "Capacidade x demanda: por que sua equipe vive apagando incêndio", kind: "AUTORIDADE" },
  { title: "Como não escolher a tecnologia errada: 3 perguntas antes de assinar", kind: "AUTORIDADE" },

  // RELACIONAMENTO
  { title: "Bastidor: um dia de sessão de mapeamento", kind: "RELACIONAMENTO" },
  { title: "O erro que a gente já cometeu e não comete mais", kind: "RELACIONAMENTO" },
  { title: "Apresentação individual dos sócios — o que cada um faz no projeto", kind: "RELACIONAMENTO" },
  { title: "Por que a gente escolheu ficar em Uberaba", kind: "RELACIONAMENTO" },
  { title: "Reação a um comentário/DM recorrente", kind: "RELACIONAMENTO" },
  { title: "3 ideias de engenharia de produção que a gente aplica toda semana", kind: "RELACIONAMENTO" },
  { title: "Bastidor: a hora em que o cliente vê o dashboard pela primeira vez", kind: "RELACIONAMENTO" },
  { title: "Caixinha mensal: manda o seu processo travado que eu analiso nos stories", kind: "RELACIONAMENTO" },

  // VENDAS
  { title: "O que você recebe no Mapa — desdobrar a entrega item por item", kind: "VENDAS" },
  { title: "Demonstração de tela: dashboard de indicadores em tempo real", kind: "VENDAS" },
  { title: "Para quem a Triângulo NÃO serve — filtro de lead", kind: "VENDAS" },
  {
    title: "Depoimento em vídeo do cliente (FN Cortinas)",
    kind: "VENDAS",
    description: `Depoimento vale mais que qualquer carrossel. Roteiro de 3 perguntas:
1. Como era orçar antes?
2. O que mudou no dia a dia?
3. O que você diria pra quem está na mesma situação?

Combinar a gravação junto com a coleta dos números do Antes & Depois.`,
  },
  { title: "Quanto custa um projeto? Falar de faixa e de critério", kind: "VENDAS" },
  { title: "Vagas do mês para diagnóstico (escassez real)", kind: "VENDAS" },
  {
    title: "MicroSaaS sob medida: quando faz sentido pra empresa do seu tamanho",
    kind: "VENDAS",
    description: `Usar a FN como exemplo concreto: sistema pronto de mercado não conhece a regra
de franzido 3×, nem infere trilho duplo, nem sabe o corte do rolo da loja.

Critério para o dono decidir: se a regra que define seu preço é sua e só sua,
sistema genérico não cabe.`,
  },
  {
    title: "Do Problema ao Lucro #02 — próximo caso real",
    kind: "VENDAS",
    description: `O #01 é a FN Cortinas. Este é o próximo — definir qual cliente entra e começar
a coletar o "antes" já no diagnóstico, não depois.

Lição que a FN deixou: sem medir o antes na hora do Mapa, o carrossel de caso
fica sem os cards 5 e 6. Medir passa a ser parte do rito de entrada.`,
  },
];

/* -------------------------------------------------------------------------- */
/* seed                                                                        */
/* -------------------------------------------------------------------------- */

async function main() {
  console.log("Limpando dados anteriores…");
  await db.notification.deleteMany();
  await db.activityLog.deleteMany();
  await db.comment.deleteMany();
  await db.attachment.deleteMany();
  await db.taskTag.deleteMany();
  await db.taskDependency.deleteMany();
  await db.taskCollaborator.deleteMany();
  await db.taskProject.deleteMany();
  await db.task.deleteMany();
  await db.tag.deleteMany();
  await db.section.deleteMany();
  await db.viewPreference.deleteMany();
  await db.subtaskTemplate.deleteMany();
  await db.projectMember.deleteMany();
  await db.project.deleteMany();
  await db.user.deleteMany();

  /* ------------------------------- usuários ------------------------------- */

  const pass = await bcrypt.hash("triangulo", 10);

  const matheus = await db.user.create({
    data: {
      name: "Matheus Tomé",
      email: "matheusmigueltome@gmail.com",
      passwordHash: pass,
      role: "ADMIN",
      avatarColor: "#CE2B34",
    },
  });

  // Contas de exemplo — renomeie em Membros do projeto quando definir a equipe.
  const socio = await db.user.create({
    data: {
      name: "Sócio 2",
      email: "socio2@triangulosolutions.com.br",
      passwordHash: pass,
      avatarColor: "#4573D2",
    },
  });

  const social = await db.user.create({
    data: {
      name: "Social Media",
      email: "social@triangulosolutions.com.br",
      passwordHash: pass,
      avatarColor: "#5DA283",
    },
  });

  const owners = { estrategia: matheus, social };

  console.log("Usuários criados: 3");

  /* ----------------------- projeto: Instagram (ciclo 1) -------------------- */

  const project = await db.project.create({
    data: {
      name: "Instagram · Planejamento de Conteúdo",
      color: "#CE2B34",
      icon: "instagram",
      status: "ON_TRACK",
      startDate: d(3, 8, 0, 0),
      endDate: d(31, 8, 23, 59),
      description: `Ciclo 1 do planejamento editorial — agosto de 2026. @triangulosolutionsbrasil

**Cadência: dia sim, dia não.** Feed nos dias ímpares de agosto (03, 05, 07…
31) — 15 posts. Stories nos dias pares, para o "dia não" nunca ficar mudo.

**A âncora deixou de ser o dia da semana e passou a ser o tipo.** Com posts em
dias alternados o dia da semana varia, então a previsibilidade vem do rodízio
dos 4 tipos, sempre nesta ordem:
ALCANCE › AUTORIDADE › RELACIONAMENTO › VENDAS › repete.

**Semana 1 (03 a 09/ago) é 100% sem gravação.** Ainda não há estrutura de vídeo,
então tudo sai em arte estática e carrossel. O primeiro Reels é 15/08 — é essa a
data-limite para resolver a gravação.

**Peso no feed:** Alcance 33% · Autoridade 27% · Relacionamento 20% · Vendas 20%.
Relacionamento parece baixo de propósito: ele vive nos stories, onde
relacionamento realmente acontece.

**O que se vende aqui é O Mapa**, a sessão de diagnóstico — não o software.
Vender software direto quebra a promessa "nenhuma linha de código antes de
entender onde está o seu lucro".

**Duas travas de marca, obrigatórias em toda legenda**
1. Nunca escrever "somos engenheiros" — a formação está em curso. Sempre
   "método da engenharia de produção".
2. Palavras banidas: milagre, revolucionário, mágico, disrupção,
   "transformação digital" solta, "a IA resolve tudo".

**Régua de ouro:** se um dono de empresa ocupado não entender em 5 segundos, reescreve.`,
      members: {
        create: [
          { userId: matheus.id, role: "OWNER", favorite: true },
          { userId: socio.id, role: "EDITOR", favorite: true },
          { userId: social.id, role: "EDITOR", favorite: false },
        ],
      },
    },
  });

  /* -------------------------------- seções -------------------------------- */

  const sectionOrders = initialOrders(6);
  const sectionNames = [
    "Semana 1 · 03–09/ago",
    "Semana 2 · 10–16/ago",
    "Semana 3 · 17–23/ago",
    "Semana 4 · 24–31/ago",
    "Banco de pautas",
    "Publicado",
  ];

  const sections = await Promise.all(
    sectionNames.map((name, i) =>
      db.section.create({ data: { projectId: project.id, name, order: sectionOrders[i] } }),
    ),
  );
  const weekSection = (w: number) => sections[w - 1].id;
  const backlogSection = sections[4].id;

  /* --------------------------------- tags --------------------------------- */

  // Os 4 tipos de conteúdo — o eixo funcional do planejamento.
  const kindColors: Record<Kind, string> = {
    ALCANCE: "#4573D2",
    AUTORIDADE: "#F1BD6C",
    RELACIONAMENTO: "#5DA283",
    VENDAS: "#CE2B34",
  };

  const kindTags: Record<string, string> = {};
  for (const [name, color] of Object.entries(kindColors)) {
    const tag = await db.tag.create({ data: { name, color, projectId: project.id } });
    kindTags[name] = tag.id;
  }

  const formatColors: Record<string, string> = {
    REELS: "#8D84E8",
    CARROSSEL: "#4FB3A6",
    "ESTÁTICO": "#A8C466",
    STORIES: "#F9AAEF",
  };
  const formatTags: Record<string, string> = {};
  for (const [name, color] of Object.entries(formatColors)) {
    const tag = await db.tag.create({ data: { name, color, projectId: project.id } });
    formatTags[name] = tag.id;
  }

  const ritualNames = [
    "RAIO-X DE PROCESSO",
    "SEM HYPE",
    "DO PROBLEMA AO LUCRO",
    "PERGUNTA DE ENGENHARIA",
  ];
  const ritualTags: Record<string, string> = {};
  for (const name of ritualNames) {
    const tag = await db.tag.create({ data: { name, color: "#9A9AA2", projectId: project.id } });
    ritualTags[name] = tag.id;
  }

  console.log("Tags criadas: 12 (4 tipos + 4 formatos + 4 rituais)");

  /* ----------------------- template do fluxo de produção ------------------- */

  const templateItems = [
    { title: "DEMANDAR", offsetDays: -6, defaultAssigneeEmail: matheus.email },
    { title: "TRÁFEGO INTERNO", offsetDays: -5, defaultAssigneeEmail: socio.email },
    { title: "EDIÇÃO", offsetDays: -4, defaultAssigneeEmail: social.email },
    { title: "LEGENDA", offsetDays: -3, defaultAssigneeEmail: matheus.email },
    { title: "APROVAÇÃO", offsetDays: -1, defaultAssigneeEmail: matheus.email },
    { title: "PUBLICAÇÃO", offsetDays: 0, defaultAssigneeEmail: social.email },
  ];

  await db.subtaskTemplate.create({
    data: { projectId: project.id, name: "Fluxo de Produção", items: templateItems },
  });
  const byEmail: Record<string, string> = {
    [matheus.email]: matheus.id,
    [socio.email]: socio.id,
    [social.email]: social.id,
  };

  /* ------------------------------- os 12 posts ----------------------------- */

  const orderByWeek = new Map<number, Order>();
  let created = 0;
  let subtasksCreated = 0;

  for (const post of POSTS) {
    const ord = orderByWeek.get(post.week) ?? new Order();
    orderByWeek.set(post.week, ord);

    const assignee = owners[post.owner];

    const task = await db.task.create({
      data: {
        title: post.title,
        description: post.description,
        creatorId: matheus.id,
        assigneeId: assignee.id,
        dueAt: post.date,
        dueHasTime: true,
        estimatedMinutes: post.estimatedMinutes,
        projects: {
          create: {
            projectId: project.id,
            sectionId: weekSection(post.week),
            order: ord.next(),
          },
        },
        tags: {
          create: [
            { tagId: kindTags[post.kind] },
            { tagId: formatTags[post.format] },
            ...(post.ritual ? [{ tagId: ritualTags[post.ritual] }] : []),
          ],
        },
        collaborators: { create: [{ userId: socio.id }] },
      },
    });
    created++;

    await db.activityLog.create({
      data: { taskId: task.id, actorId: matheus.id, type: "created" },
    });

    // Fluxo de produção: prazos calculados retroativamente a partir do post.
    if (post.template) {
      const subOrder = new Order();
      for (const item of templateItems) {
        const due = new Date(post.date);
        due.setDate(due.getDate() + item.offsetDays);
        await db.task.create({
          data: {
            title: item.title,
            creatorId: matheus.id,
            parentTaskId: task.id,
            subtaskOrder: subOrder.next(),
            dueAt: due,
            dueHasTime: true,
            assigneeId: byEmail[item.defaultAssigneeEmail],
          },
        });
        subtasksCreated++;
      }
      await db.activityLog.create({
        data: { taskId: task.id, actorId: matheus.id, type: "template_applied" },
      });
    }
  }

  /* -------------------------------- stories -------------------------------- */

  for (const s of STORIES) {
    const ord = orderByWeek.get(s.week) ?? new Order();
    orderByWeek.set(s.week, ord);

    const task = await db.task.create({
      data: {
        title: s.title,
        description: s.description,
        creatorId: matheus.id,
        assigneeId: social.id,
        dueAt: s.date,
        dueHasTime: true,
        estimatedMinutes: 30,
        projects: {
          create: {
            projectId: project.id,
            sectionId: weekSection(s.week),
            order: ord.next(),
          },
        },
        tags: {
          create: [
            { tagId: kindTags[s.kind] },
            { tagId: formatTags.STORIES },
            ...(s.title.includes("Pergunta de Engenharia")
              ? [{ tagId: ritualTags["PERGUNTA DE ENGENHARIA"] }]
              : []),
          ],
        },
      },
    });
    created++;
    await db.activityLog.create({
      data: { taskId: task.id, actorId: matheus.id, type: "created" },
    });
  }

  /* ----------------------------- banco de pautas ---------------------------- */

  const backlogOrder = new Order();
  for (const item of BACKLOG) {
    await db.task.create({
      data: {
        title: item.title,
        creatorId: matheus.id,
        description:
          item.description ??
          "Pauta do banco do ciclo 1. Ao puxar para uma semana, definir formato, " +
            "prazo com hora e aplicar o template Fluxo de Produção.",
        projects: {
          create: {
            projectId: project.id,
            sectionId: backlogSection,
            order: backlogOrder.next(),
          },
        },
        tags: { create: [{ tagId: kindTags[item.kind] }] },
      },
    });
    created++;
  }

  /* ---------------------- projeto de apoio: LinkedIn ------------------------ */

  const linkedin = await db.project.create({
    data: {
      name: "LinkedIn · Autoridade dos sócios",
      color: "#4573D2",
      icon: "linkedin",
      status: "ON_TRACK",
      description: `Canal principal B2B segundo o documento de branding — é onde os decisores estão.

**Regra de reaproveitamento:** todo carrossel de AUTORIDADE publicado na quarta
no Instagram vira post de texto no LinkedIn na quinta, assinado pelo sócio.
Zero roteiro extra, dobra de cobertura.`,
      members: {
        create: [
          { userId: matheus.id, role: "OWNER", favorite: false },
          { userId: socio.id, role: "EDITOR", favorite: false },
        ],
      },
    },
  });

  const liOrders = initialOrders(3);
  const liSections = await Promise.all(
    ["A fazer", "Em andamento", "Publicado"].map((name, i) =>
      db.section.create({ data: { projectId: linkedin.id, name, order: liOrders[i] } }),
    ),
  );

  const liOrder = new Order();
  for (const [i, day] of [6, 13, 20, 27].entries()) {
    await db.task.create({
      data: {
        title: `Adaptação LinkedIn — carrossel de AUTORIDADE da semana ${i + 1}`,
        description:
          "Transformar o carrossel de quarta em post de texto assinado pelo sócio. " +
          "Mesmo argumento, sem card — abrir com o gancho e fechar com o bordão.",
        creatorId: matheus.id,
        assigneeId: matheus.id,
        dueAt: d(day, 8, 9, 0),
        dueHasTime: true,
        estimatedMinutes: 40,
        projects: {
          create: { projectId: linkedin.id, sectionId: liSections[0].id, order: liOrder.next() },
        },
      },
    });
    created++;
  }

  /* ------------------------- dependência de exemplo ------------------------ */

  // O caso real (28/08) depende de a oferta do Mapa ter rodado antes (14/08).
  const caso = await db.task.findFirst({ where: { title: { startsWith: "Do Problema ao Lucro #01" } } });
  const mapa = await db.task.findFirst({
    where: { title: { startsWith: "Nenhuma linha de código" } },
  });
  if (caso && mapa) {
    await db.taskDependency.create({
      data: { blockedId: caso.id, blockingId: mapa.id },
    });
  }

  /* ------------------------------ comentários ------------------------------ */

  const creationStory = await db.task.findFirst({
    where: { title: { startsWith: "Por que a gente fundou" } },
  });
  if (creationStory) {
    await db.comment.create({
      data: {
        taskId: creationStory.id,
        authorId: matheus.id,
        body:
          "Antes de gravar precisamos fechar a Creation Story real — o documento de " +
          "branding ainda traz um modelo. @Sócio manda os fatos: quantos sócios, onde " +
          "nos conhecemos e qual foi o caso que deu o estalo.",
      },
    });
    await db.notification.create({
      data: {
        userId: socio.id,
        actorId: matheus.id,
        type: "MENTIONED",
        taskId: creationStory.id,
      },
    });
  }

  /* ------------------------- preferências de visão ------------------------- */

  for (const viewType of ["list", "board", "calendar"]) {
    await db.viewPreference.create({
      data: {
        userId: matheus.id,
        projectId: project.id,
        viewType,
        filters: { incomplete: true, assigneeIds: [], tagIds: [] },
        sortBy: viewType === "list" ? "manual" : "manual",
        groupBy: "section",
      },
    });
  }

  console.log(`Tarefas criadas: ${created} (+${subtasksCreated} subtarefas do fluxo)`);
  console.log("");
  console.log("  Acesso:  matheusmigueltome@gmail.com  ·  senha: triangulo");
  console.log("  Também:  socio2@triangulosolutions.com.br / social@triangulosolutions.com.br");
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
