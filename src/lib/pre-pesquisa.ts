/**
 * Pré-pesquisa "Pra gente conhecer um pouquinho melhor quem está
 * respondendo" (pedido do cliente, out/2026). Catálogo fixo, em código.
 *
 * LGPD: idade, peso e altura são perguntados em FAIXAS (nunca o número
 * exato) e toda pergunta pode ficar sem resposta ou ter "Prefiro não
 * responder" — com o mínimo de 3 respostas por grupo, números exatos
 * cruzados com o setor identificariam pessoas. Funções puras.
 */

export type ChavePrePesquisa =
  | "tempoEmpresa"
  | "faixaIdade"
  | "sexo"
  | "faixaPeso"
  | "faixaAltura"
  | "alcool"
  | "outraRenda"
  | "apostas";

export type PerguntaPrePesquisa = {
  chave: ChavePrePesquisa;
  numero: number;
  /** Chamada descontraída (com emoji) — só na tela do colaborador. */
  chamada?: string;
  pergunta: string;
  /** Rótulo curto para painéis e relatórios. */
  rotuloCurto: string;
  opcoes: { valor: string; rotulo: string }[];
};

const PREFIRO_NAO = { valor: "PREFIRO_NAO", rotulo: "Prefiro não responder" };

export const PRE_PESQUISA = {
  titulo: "Pra gente conhecer um pouquinho melhor quem está respondendo 😊",
  aviso:
    "Fique tranquilo(a): não é investigação! Essas informações ajudam apenas a entender melhor o perfil dos participantes e serão analisadas de forma conjunta. Todas as perguntas são opcionais.",
};

export const PERGUNTAS_PRE_PESQUISA: PerguntaPrePesquisa[] = [
  {
    chave: "tempoEmpresa",
    numero: 1,
    pergunta: "Há quanto tempo você está na empresa?",
    rotuloCurto: "Tempo de empresa",
    opcoes: [
      { valor: "MENOS_1", rotulo: "Menos de 1 ano" },
      { valor: "1_3", rotulo: "De 1 a 3 anos" },
      { valor: "4_6", rotulo: "De 4 a 6 anos" },
      { valor: "7_10", rotulo: "De 7 a 10 anos" },
      { valor: "MAIS_10", rotulo: "Mais de 10 anos" },
    ],
  },
  {
    chave: "faixaIdade",
    numero: 2,
    pergunta: "Qual é a sua idade?",
    rotuloCurto: "Idade",
    opcoes: [
      { valor: "ATE_24", rotulo: "Até 24 anos" },
      { valor: "25_34", rotulo: "De 25 a 34 anos" },
      { valor: "35_44", rotulo: "De 35 a 44 anos" },
      { valor: "45_54", rotulo: "De 45 a 54 anos" },
      { valor: "55_MAIS", rotulo: "55 anos ou mais" },
      PREFIRO_NAO,
    ],
  },
  {
    chave: "sexo",
    numero: 3,
    pergunta: "Sexo:",
    rotuloCurto: "Sexo",
    opcoes: [{ valor: "FEMININO", rotulo: "Feminino" }, { valor: "MASCULINO", rotulo: "Masculino" }, PREFIRO_NAO],
  },
  {
    chave: "faixaPeso",
    numero: 4,
    pergunta: "Peso aproximado:",
    rotuloCurto: "Peso",
    opcoes: [
      { valor: "ATE_60", rotulo: "Até 60 kg" },
      { valor: "61_70", rotulo: "De 61 a 70 kg" },
      { valor: "71_80", rotulo: "De 71 a 80 kg" },
      { valor: "81_90", rotulo: "De 81 a 90 kg" },
      { valor: "91_100", rotulo: "De 91 a 100 kg" },
      { valor: "MAIS_100", rotulo: "Mais de 100 kg" },
      PREFIRO_NAO,
    ],
  },
  {
    chave: "faixaAltura",
    numero: 5,
    pergunta: "Altura aproximada:",
    rotuloCurto: "Altura",
    opcoes: [
      { valor: "ATE_155", rotulo: "Até 1,55 m" },
      { valor: "156_165", rotulo: "De 1,56 a 1,65 m" },
      { valor: "166_175", rotulo: "De 1,66 a 1,75 m" },
      { valor: "176_185", rotulo: "De 1,76 a 1,85 m" },
      { valor: "MAIS_185", rotulo: "Mais de 1,85 m" },
      PREFIRO_NAO,
    ],
  },
  {
    chave: "alcool",
    numero: 6,
    chamada: "E a famosa “cervejinha do fim de semana”? 🍻",
    pergunta: "Com que frequência você costuma consumir bebidas alcoólicas?",
    rotuloCurto: "Bebidas alcoólicas",
    opcoes: [
      { valor: "NAO", rotulo: "Não consumo" },
      { valor: "RARAMENTE", rotulo: "Raramente" },
      { valor: "MES", rotulo: "Algumas vezes no mês" },
      { valor: "SEMANA", rotulo: "Algumas vezes na semana" },
      { valor: "DIARIO", rotulo: "Diariamente ou quase diariamente" },
      PREFIRO_NAO,
    ],
  },
  {
    chave: "outraRenda",
    numero: 7,
    chamada: "Tem algum “plano B” para reforçar a renda? 💼",
    pergunta: "Além deste trabalho, você exerce outra atividade remunerada?",
    rotuloCurto: "Outra atividade remunerada",
    opcoes: [
      { valor: "NAO", rotulo: "Não" },
      { valor: "AS_VEZES", rotulo: "Sim, de vez em quando" },
      { valor: "REGULAR", rotulo: "Sim, regularmente" },
      PREFIRO_NAO,
    ],
  },
  {
    chave: "apostas",
    numero: 8,
    chamada: "E a sorte, anda sendo testada? 🎲",
    pergunta: "Você costuma fazer apostas ou participar de jogos que envolvam dinheiro, inclusive on-line?",
    rotuloCurto: "Apostas e jogos a dinheiro",
    opcoes: [
      { valor: "NAO", rotulo: "Não" },
      { valor: "RARAMENTE", rotulo: "Raramente" },
      { valor: "MES", rotulo: "Algumas vezes no mês" },
      { valor: "SEMANA", rotulo: "Algumas vezes na semana" },
      { valor: "DIARIO", rotulo: "Diariamente ou quase diariamente" },
      PREFIRO_NAO,
    ],
  },
];

export type RespostasPrePesquisa = Record<ChavePrePesquisa, string | null>;

/**
 * Lê o formulário: só aceita valores do catálogo (qualquer outra coisa
 * vira "não respondeu"). `vazia` = nenhuma pergunta respondida.
 */
export function lerPrePesquisa(formData: FormData): { respostas: RespostasPrePesquisa; vazia: boolean } {
  const respostas = {} as RespostasPrePesquisa;
  for (const p of PERGUNTAS_PRE_PESQUISA) {
    const v = String(formData.get(p.chave) ?? "");
    respostas[p.chave] = p.opcoes.some((o) => o.valor === v) ? v : null;
  }
  return { respostas, vazia: Object.values(respostas).every((v) => v === null) };
}

export type DistribuicaoPergunta = {
  pergunta: PerguntaPrePesquisa;
  respondentes: number;
  opcoes: { valor: string; rotulo: string; quantidade: number; percentual: number }[];
  semResposta: number;
};

/** Contagem por opção de cada pergunta (para o perfil agregado). */
export function distribuir(linhas: Partial<RespostasPrePesquisa>[]): DistribuicaoPergunta[] {
  return PERGUNTAS_PRE_PESQUISA.map((pergunta) => {
    const respondidas = linhas.map((l) => l[pergunta.chave] ?? null).filter((v): v is string => v !== null);
    return {
      pergunta,
      respondentes: respondidas.length,
      semResposta: linhas.length - respondidas.length,
      opcoes: pergunta.opcoes.map((o) => {
        const quantidade = respondidas.filter((v) => v === o.valor).length;
        return { ...o, quantidade, percentual: respondidas.length ? quantidade / respondidas.length : 0 };
      }),
    };
  });
}

export function rotuloOpcao(chave: ChavePrePesquisa, valor: string | null): string {
  if (valor === null) return "Não respondeu";
  return PERGUNTAS_PRE_PESQUISA.find((p) => p.chave === chave)?.opcoes.find((o) => o.valor === valor)?.rotulo ?? valor;
}
