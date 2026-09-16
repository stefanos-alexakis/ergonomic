import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { criarEmpresaComGestor } from "@/lib/workspace";
import { adicionarItemCatalogo } from "@/lib/estrutura";
import { criarPesquisa } from "@/lib/pesquisa";
import { gerarLicencas } from "@/lib/licenca";
import { db } from "@/lib/db";

/**
 * Popula uma empresa de demonstração com dados simulados, mas realistas,
 * pra construir e validar o dashboard/relatório com Score sem depender
 * de dados reais de cliente. Roda direto contra o banco (não passa pela
 * jornada real do colaborador) — mais rápido, e controla o perfil de
 * risco de cada grupo de propósito, pra ter algo visualmente
 * interessante (grupos com risco alto/baixo, e um grupo pequeno o
 * bastante pra aparecer suprimido, testando essa regra também).
 *
 * Uso: npx tsx scripts/seed-empresa-teste.ts
 */

type PerfilRisco = {
  base: number; // média-alvo em 1–5 (5 = pior)
  porDimensao?: Record<string, number>; // ajuste aditivo por dimensão
  jitter: number; // variação aleatória por pessoa
};

const PERFIL_PRODUCAO: PerfilRisco = {
  base: 3.6,
  porDimensao: {
    "4. Ritmo e Cadência": 1.0,
    "5. Horários e Jornada": 0.8,
    "2. Demandas de Trabalho": 0.6,
    "6. Segurança no Emprego": 0.4,
    "9. Liderança": -0.6,
    "8. Relações Interpessoais": -0.7,
  },
  jitter: 0.6,
};

const PERFIL_ADMINISTRATIVO: PerfilRisco = {
  base: 1.9,
  porDimensao: {
    "10. Equilíbrio Trabalho-Vida": 1.1,
    "9. Liderança": 0.3,
  },
  jitter: 0.5,
};

const PERFIL_COMERCIAL: PerfilRisco = {
  base: 3.1,
  porDimensao: {
    "4. Ritmo e Cadência": 1.1,
    "6. Segurança no Emprego": 0.8,
    "2. Demandas de Trabalho": 0.5,
  },
  jitter: 0.7,
};

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function gerarValor(perfil: PerfilRisco, nomeDimensao: string): number {
  const ajuste = perfil.porDimensao?.[nomeDimensao] ?? 0;
  const ruido = (Math.random() - 0.5) * 2 * perfil.jitter;
  const alvo = clamp(perfil.base + ajuste + ruido, 1, 5);
  return Math.round(alvo);
}

async function main() {
  console.log("Criando empresa de demonstração...");

  const resultadoEmpresa = await criarEmpresaComGestor({
    nomeEmpresa: "Empresa Demonstração",
    corPrimaria: "#0f6e6e",
    corSecundaria: "#edf1ef",
    gestorNome: "Gestor Demonstração",
    gestorEmail: "gestor@demonstracao.teste",
    gestorSenha: "demoForte123",
  });

  if (!resultadoEmpresa.ok) {
    console.error("Falha ao criar empresa:", resultadoEmpresa.erro);
    console.error("Se já existe, apague antes: a empresa 'Empresa Demonstração' talvez já tenha sido seedada.");
    process.exit(1);
  }

  const workspaceId = resultadoEmpresa.workspaceId;
  console.log(`Workspace criado: ${resultadoEmpresa.slug} (${workspaceId})`);

  // ── Catálogo organizacional ────────────────────────────────────────
  const [setorProducao, setorAdministrativo, setorComercial] = await Promise.all([
    adicionarItemCatalogo(workspaceId, "setor", "Produção"),
    adicionarItemCatalogo(workspaceId, "setor", "Administrativo"),
    adicionarItemCatalogo(workspaceId, "setor", "Comercial"),
  ]);

  const [deptoLinha, deptoManutencao, deptoFinanceiro, deptoRH, deptoVendas] = await Promise.all([
    adicionarItemCatalogo(workspaceId, "departamento", "Linha de Montagem"),
    adicionarItemCatalogo(workspaceId, "departamento", "Manutenção"),
    adicionarItemCatalogo(workspaceId, "departamento", "Financeiro"),
    adicionarItemCatalogo(workspaceId, "departamento", "Recursos Humanos"),
    adicionarItemCatalogo(workspaceId, "departamento", "Vendas"),
  ]);

  const [segOperacional, segAdministrativo] = await Promise.all([
    adicionarItemCatalogo(workspaceId, "segmento", "Operacional"),
    adicionarItemCatalogo(workspaceId, "segmento", "Administrativo"),
  ]);

  const [funcOperador, funcTecnico, funcAnalistaFin, funcAnalistaRH, funcVendedor] = await Promise.all([
    adicionarItemCatalogo(workspaceId, "funcao", "Operador de Produção"),
    adicionarItemCatalogo(workspaceId, "funcao", "Técnico de Manutenção"),
    adicionarItemCatalogo(workspaceId, "funcao", "Analista Financeiro"),
    adicionarItemCatalogo(workspaceId, "funcao", "Analista de RH"),
    adicionarItemCatalogo(workspaceId, "funcao", "Vendedor"),
  ]);

  console.log("Catálogo organizacional criado.");

  // ── Pesquisa ─────────────────────────────────────────────────────
  const questionario = await db.questionario.findFirst({ where: { ativo: true } });
  if (!questionario) {
    console.error("Nenhum questionário ativo — rode o seed principal primeiro (npm run db:seed).");
    process.exit(1);
  }

  const agora = new Date();
  const resultadoPesquisa = await criarPesquisa({
    workspaceId,
    questionarioId: questionario.id,
    nome: "Diagnóstico Psicossocial — Demonstração",
    dataInicio: new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000),
    dataFim: new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000),
    licencasSolicitadas: 25,
  });

  if (!resultadoPesquisa.ok) {
    console.error("Falha ao criar pesquisa:", resultadoPesquisa.erro);
    process.exit(1);
  }

  await db.pesquisa.update({ where: { id: resultadoPesquisa.pesquisaId }, data: { status: "ABERTA" } });
  const pesquisaId = resultadoPesquisa.pesquisaId;

  const licencas = await gerarLicencas(pesquisaId);
  if (!licencas.ok) {
    console.error("Falha ao gerar licenças:", licencas.erro);
    process.exit(1);
  }
  console.log(`Pesquisa criada com ${licencas.participantes} códigos de participante.`);

  const codigosDisponiveis = await db.codigoAcesso.findMany({
    where: { pesquisaId, tipo: "PARTICIPANTE" },
    orderBy: { createdAt: "asc" },
  });

  // ── Catálogo de perguntas com dimensão, pra gerar valor por dimensão ──
  const perguntas = await db.pergunta.findMany({
    include: { fatorRisco: { select: { dimensao: { select: { nome: true } } } } },
    orderBy: { ordemGlobal: "asc" },
  });

  // ── Perfis de respondentes simulados ──────────────────────────────
  // 18 pessoas: Produção (8, risco alto), Administrativo (6, risco
  // baixo), Comercial (4 — de propósito abaixo do limite de supressão
  // padrão de 5, pra testar essa regra no dashboard/relatório).
  type Perfil = {
    perfil: PerfilRisco;
    setorId: string;
    departamentoId: string;
    segmentoId: string;
    funcaoId: string;
  };
  const perfis: Perfil[] = [
    ...Array.from({ length: 5 }, () => ({
      perfil: PERFIL_PRODUCAO,
      setorId: setorProducao.id,
      departamentoId: deptoLinha.id,
      segmentoId: segOperacional.id,
      funcaoId: funcOperador.id,
    })),
    ...Array.from({ length: 3 }, () => ({
      perfil: PERFIL_PRODUCAO,
      setorId: setorProducao.id,
      departamentoId: deptoManutencao.id,
      segmentoId: segOperacional.id,
      funcaoId: funcTecnico.id,
    })),
    ...Array.from({ length: 3 }, () => ({
      perfil: PERFIL_ADMINISTRATIVO,
      setorId: setorAdministrativo.id,
      departamentoId: deptoFinanceiro.id,
      segmentoId: segAdministrativo.id,
      funcaoId: funcAnalistaFin.id,
    })),
    ...Array.from({ length: 3 }, () => ({
      perfil: PERFIL_ADMINISTRATIVO,
      setorId: setorAdministrativo.id,
      departamentoId: deptoRH.id,
      segmentoId: segAdministrativo.id,
      funcaoId: funcAnalistaRH.id,
    })),
    ...Array.from({ length: 4 }, () => ({
      perfil: PERFIL_COMERCIAL,
      setorId: setorComercial.id,
      departamentoId: deptoVendas.id,
      segmentoId: segAdministrativo.id,
      funcaoId: funcVendedor.id,
    })),
  ];

  if (perfis.length > codigosDisponiveis.length) {
    throw new Error("Licenças insuficientes para o número de respondentes simulados.");
  }

  console.log(`Simulando ${perfis.length} respostas concluídas...`);

  for (let i = 0; i < perfis.length; i++) {
    const codigo = codigosDisponiveis[i]!;
    const p = perfis[i]!;
    const iniciadoEm = new Date(agora.getTime() - Math.floor(Math.random() * 20) * 24 * 60 * 60 * 1000);
    const concluidoEm = new Date(iniciadoEm.getTime() + 9 * 60 * 1000);

    await db.$transaction(async (tx) => {
      const resposta = await tx.resposta.create({
        data: {
          codigoAcessoId: codigo.id,
          setorId: p.setorId,
          departamentoId: p.departamentoId,
          segmentoId: p.segmentoId,
          funcaoId: p.funcaoId,
          iniciadoEm,
          concluidoEm,
        },
      });

      await tx.respostaItem.createMany({
        data: perguntas.map((pergunta) => ({
          respostaId: resposta.id,
          perguntaId: pergunta.id,
          valor: gerarValor(p.perfil, pergunta.fatorRisco.dimensao.nome),
          respondidoEm: concluidoEm,
        })),
      });

      await tx.codigoAcesso.update({ where: { id: codigo.id }, data: { status: "CONCLUIDO" } });
    });
  }

  console.log(`Pronto. ${perfis.length} respostas simuladas na pesquisa "${resultadoPesquisa.pesquisaId}".`);
  console.log(`Login do gestor: gestor@demonstracao.teste / demoForte123`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
