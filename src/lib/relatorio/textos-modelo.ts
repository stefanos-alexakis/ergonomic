/**
 * Textos fixos do relatório final, no modelo enviado pela cliente
 * ("Relatório sistema Fatores de Risco Psicossocial.docx", nov/2026). Iguais
 * para todas as empresas. As partes que dependem da empresa (dados dos eixos,
 * cruzamento analítico, conclusão, fontes internas) vêm do sistema e do rascunho.
 */

export const OBJETIVO = [
  "Este documento possui o objetivo de apresentar, de forma estruturada, o processo de mapeamento e monitoramento dos Fatores de Risco Psicossociais Relacionados ao Trabalho (FRPRT) na organização, contemplando o diagnóstico das condições de trabalho relacionadas à saúde mental, física e social dos colaboradores, em atendimento às exigências legais vigentes.",
  "Além do caráter diagnóstico, o documento estabelece as diretrizes metodológicas, os eixos de atuação e o plano de ação que orientarão as etapas seguintes do trabalho, servindo como ponto de partida de um processo contínuo de monitoramento e revisão anual.",
];

export const INTRODUCAO = [
  "A saúde mental no ambiente de trabalho tem ganhado relevância crescente na gestão de Segurança e Saúde no Trabalho (SST), acompanhando o reconhecimento, pela literatura técnica e pelo ordenamento jurídico brasileiro, de que fatores relacionados à organização do trabalho, às relações interpessoais e às condições do ambiente laboral impactam diretamente o bem-estar e a produtividade dos colaboradores.",
  "Trata-se, ainda, nesta data (2026) de um momento inicial de implantação desse tema nas organizações. Desde a alteração promovida na NR-1 em 2025 (item 1.5), interpretações diversas sobre a abrangência e a forma de aplicação da norma têm gerado confusão tanto para empregadores quanto para colaboradores. Sob essa perspectiva, entende-se que o trabalho técnico deve consistir na realização de um levantamento claro e transparente, capaz de confrontar o que a empresa efetivamente pratica, a percepção dos colaboradores, as evidências objetivas levantadas em campo e as ações que precisam ser aprimoradas, complementadas ou implementadas onde ainda inexistentes. O trabalho deve seguir com o consequente monitoramento contínuo dos resultados, de modo que a gestão dos riscos psicossociais seja definitivamente incorporada à cultura e à rotina da organização a partir deste momento.",
  "Nesse contexto, este dossiê consolida a metodologia adotada pela empresa de ergonomia responsável para o mapeamento dos FRPRT, alinhada às normas regulamentadoras aplicáveis e às boas práticas reconhecidas internacionalmente, estabelecendo uma base técnica sólida para a gestão preventiva dos riscos psicossociais na organização.",
];

/** Bloco de texto: parágrafo, subtítulo, lista ou parágrafo com rótulo em negrito. */
export type BlocoTexto =
  | { tipo: "p"; texto: string }
  | { tipo: "sub"; texto: string }
  | { tipo: "rotulo"; rotulo: string; texto: string }
  | { tipo: "lista"; itens: string[] }
  | { tipo: "quadro"; linhas: { rotulo: string; texto: string }[] };

export const LEGISLACAO: BlocoTexto[] = [
  { tipo: "sub", texto: "NR-1 — Gerenciamento de Riscos Ocupacionais (GRO/PGR)" },
  {
    tipo: "p",
    texto:
      "A Norma Regulamentadora nº 1 (NR-1), com a nova redação do capítulo 1.5 (Gerenciamento de Riscos Ocupacionais — GRO), aprovada pela Portaria MTE nº 1.419/2024 e com vigência prorrogada pela Portaria MTE nº 765/2025 para 26 de maio de 2026, passou a exigir expressamente a identificação, avaliação e gestão dos Fatores de Risco Psicossociais Relacionados ao Trabalho (FRPRT) no âmbito do Programa de Gerenciamento de Riscos (PGR).",
  },
  {
    tipo: "p",
    texto:
      "Nos termos da norma, os riscos psicossociais integram o inventário de riscos ocupacionais em conjunto com os riscos físicos, químicos, biológicos e de acidentes, devendo ser tratados com o mesmo rigor técnico — caracterização dos processos de trabalho, identificação dos perigos, avaliação e descrição das medidas de prevenção adotadas. O texto da NR-1 remete expressamente à NR-17 (Ergonomia) como parâmetro complementar para a avaliação das condições de trabalho relacionadas a esses fatores.",
  },
  {
    tipo: "p",
    texto:
      "Complementarmente ao arcabouço normativo nacional, adota-se como referência metodológica internacional a norma ISO 45003:2021, que estabelece diretrizes para a gestão da saúde e segurança psicológica no trabalho e recomenda a consulta e a participação dos trabalhadores no processo de gerenciamento dos riscos psicossociais.",
  },
  { tipo: "sub", texto: "Fundamentação legal e caracterização metodológica" },
  {
    tipo: "p",
    texto:
      "A metodologia de identificação e avaliação dos Fatores de Riscos Psicossociais Relacionados ao Trabalho (FRPRT) foi estruturada em consonância com os requisitos do item 1.5 da NR-01, em articulação com a NR-17, e considerando as orientações técnicas publicadas pelo Ministério do Trabalho e Emprego.",
  },
  {
    tipo: "p",
    texto:
      "A metodologia privilegia a análise das condições efetivas de trabalho, evitando interpretações exclusivamente baseadas em percepções individuais, dados clínicos isolados ou declarações organizacionais não confrontadas com evidências.",
  },
  {
    tipo: "rotulo",
    rotulo: "Delimitação do objeto de estudo",
    texto:
      "a organização contratante é previamente orientada quanto à necessidade de contemplar todos os aspectos ergonômicos aplicáveis às suas atividades, incluindo os físicos, cognitivos e organizacionais. A delimitação contratual do estudo aos fatores psicossociais relacionados ao trabalho não implica dispensa das demais avaliações ergonômicas legalmente exigíveis, que permanecem sob responsabilidade da organização, podendo ser realizadas por profissionais habilitados e por processos complementares.",
  },
  {
    tipo: "rotulo",
    rotulo: "Participação dos trabalhadores",
    texto:
      "o levantamento utiliza formulário próprio de percepção, contendo 35 questões organizadas em 13 dimensões, com respostas analisadas coletivamente por setor. A escolha do instrumento considera a flexibilidade metodológica admitida pelas orientações do MTE, sem atribuir ao formulário condição de escala psicométrica cientificamente validada. Conforme as necessidades identificadas, os resultados poderão ser aprofundados por observação da atividade, rodas de conversa, entrevistas ou grupos focais.",
  },
  {
    tipo: "rotulo",
    rotulo: "Sensibilização e comunicação",
    texto:
      "antes da aplicação, os colaboradores participam de momento orientativo, destinado à apresentação dos objetivos da avaliação, esclarecimento do conceito de risco psicossocial relacionado ao trabalho e importância da participação consciente. A pesquisa é disponibilizada por QR Code, sem solicitação de identificação pessoal direta. O tratamento dos resultados observa requisitos de confidencialidade, proteção de dados e prevenção de identificação indireta.",
  },
  {
    tipo: "rotulo",
    rotulo: "Análise integrada",
    texto:
      "os resultados do Eixo 01 são confrontados com as informações organizacionais do Eixo 02 e com os indicadores agregados de saúde do Eixo 03, permitindo investigar a presença dos fatores, suas circunstâncias de exposição, os grupos envolvidos e a efetividade das medidas de prevenção existentes.",
  },
  {
    tipo: "rotulo",
    rotulo: "Classificação e priorização",
    texto:
      "os fatores tecnicamente caracterizados são submetidos a uma matriz FMEA adaptada, com critérios documentados de avaliação, visando à classificação dos riscos e à definição das prioridades de intervenção, observadas as exigências da NR-01 relativas à severidade, à probabilidade e à eficácia das medidas preventivas.",
  },
  {
    tipo: "rotulo",
    rotulo: "Integração ao gerenciamento ocupacional",
    texto:
      "os resultados técnicos subsidiam a Avaliação Ergonômica Preliminar, o Inventário de Riscos Ocupacionais e o Plano de Ação do PGR, cabendo à organização implementar as medidas necessárias, acompanhar sua efetividade, comunicar os resultados pertinentes aos trabalhadores e assegurar a continuidade do processo de gerenciamento dos riscos ocupacionais.",
  },
  { tipo: "sub", texto: "Lei nº 14.457/2022 — Prevenção ao Assédio e a Outras Formas de Violência no Trabalho" },
  { tipo: "p", texto: "RESPONSABILIDADE DA ORGANIZAÇÃO, COM PARTICIPAÇÃO DA CIPA" },
  {
    tipo: "p",
    texto:
      "A Lei nº 14.457, de 21 de setembro de 2022, estabelece, em seu art. 23, medidas obrigatórias de prevenção e combate ao assédio sexual e a outras formas de violência no ambiente de trabalho, incluindo regras internas de conduta, procedimentos para recebimento e apuração de denúncias, participação da CIPA e ações periódicas de capacitação e sensibilização.",
  },
  { tipo: "rotulo", rotulo: "Abordagem do tema na metodologia FRPRT", texto: "" },
  {
    tipo: "p",
    texto:
      "A metodologia de mapeamento dos Fatores de Riscos Psicossociais Relacionados ao Trabalho contempla questões que possibilitam identificar percepções, indícios e possíveis situações de assédio e violência nas relações de trabalho.",
  },
  {
    tipo: "p",
    texto:
      "Essas informações possuem caráter de indicador preventivo e termômetro organizacional, oferecendo subsídios para o aprimoramento das políticas internas, das ações de conscientização e dos mecanismos de prevenção.",
  },
  {
    tipo: "p",
    texto:
      "Por decisão metodológica, os indicadores relativos a possíveis situações de assédio não são submetidos à pontuação individualizada pela matriz FMEA utilizada neste projeto. Essa delimitação não significa desconsiderar o assédio como fator de risco psicossocial, mas reconhecer que sua abordagem exige procedimentos específicos de avaliação, prevenção, acolhimento e tratamento.",
  },
  {
    tipo: "p",
    texto:
      "O assédio, de qualquer natureza, constitui conduta inaceitável nas relações de trabalho. Sua prevenção não deve ser orientada pela definição de níveis toleráveis de ocorrência, mas pelo compromisso institucional de impedir tais práticas, identificar precocemente situações de alerta e assegurar respostas adequadas.",
  },
  {
    tipo: "p",
    texto:
      "Quando os resultados indicarem possíveis condições de exposição ao assédio ou à violência, caberá à organização promover sua avaliação no âmbito do GRO/PGR, adotando os procedimentos técnicos necessários, independentemente do fluxo específico de investigação de denúncias.",
  },
  { tipo: "rotulo", rotulo: "Diretrizes para o programa institucional de prevenção", texto: "" },
  {
    tipo: "p",
    texto:
      "Recomenda-se que a organização desenvolva um programa permanente de prevenção ao assédio e à violência, coordenado por área formalmente designada, com participação da CIPA e apoio do RH, SESMT, Jurídico, Compliance e profissionais especializados, conforme a estrutura organizacional.",
  },
  { tipo: "p", texto: "O programa poderá contemplar ações educativas e preventivas que abordem:" },
  {
    tipo: "lista",
    itens: [
      "Conceituação e diferenciação entre assédio moral, assédio sexual, discriminação, violência e situações que, isoladamente, não caracterizam necessariamente assédio;",
      "Consequências do assédio para a saúde física e mental, as relações de trabalho e a responsabilização dos envolvidos;",
      "Divulgação das políticas internas, regras de conduta e medidas disciplinares aplicáveis;",
      "Desenvolvimento de habilidades de comunicação respeitosa, gestão de conflitos, liderança ética, empatia e identificação precoce de comportamentos inadequados;",
      "Orientações práticas sobre como agir diante de situações suspeitas ou vivenciadas, incluindo os canais de acolhimento e denúncia disponíveis, a confidencialidade, a proteção contra retaliações e os procedimentos de apuração.",
    ],
  },
  {
    tipo: "quadro",
    linhas: [
      { rotulo: "Sugestão — Ação", texto: "Programa Permanente de Prevenção ao Assédio e à Violência no Trabalho." },
      {
        rotulo: "Objetivo",
        texto:
          "fortalecer uma cultura organizacional de respeito, prevenção e tolerância zero às condutas de assédio e violência, assegurando orientação aos trabalhadores, canais seguros de acolhimento e respostas institucionais efetivas.",
      },
      { rotulo: "Responsabilidade sugerida", texto: "RH/Compliance, com participação da CIPA, SESMT e apoio jurídico." },
      {
        rotulo: "Indicadores de acompanhamento",
        texto:
          "cobertura dos treinamentos, compreensão das políticas, conhecimento dos canais de denúncia, percepção de segurança para relatar situações e efetividade dos procedimentos internos, preservando o sigilo.",
      },
      { rotulo: "Periodicidade", texto: "ação contínua, com capacitação no mínimo anual e revisão sempre que necessário." },
    ],
  },
  {
    tipo: "p",
    texto:
      "As medidas educativas devem alcançar todos os níveis hierárquicos, com periodicidade mínima anual, conforme previsto na legislação, e ser complementadas por ações específicas sempre que identificada essa necessidade.",
  },
  { tipo: "rotulo", rotulo: "Integração com os resultados do mapeamento FRPRT", texto: "" },
  {
    tipo: "p",
    texto:
      "Os indicadores obtidos na pesquisa poderão subsidiar a definição de prioridades educativas, o direcionamento de ações por áreas organizacionais e o acompanhamento da percepção coletiva sobre respeito, segurança e qualidade das relações de trabalho.",
  },
  {
    tipo: "p",
    texto:
      "Esses indicadores não constituem comprovação de ocorrência individual, tampouco substituem o recebimento e a investigação de denúncias. Também não afastam a responsabilidade da organização pela avaliação dos fatores de risco ocupacionais identificados.",
  },
  {
    tipo: "p",
    texto:
      "Dessa forma, o presente dossiê contribui para a prevenção institucional do assédio, preservando os limites da metodologia aplicada e orientando a organização quanto à necessidade de manter procedimentos próprios, permanentes e efetivos para prevenção, identificação, apuração e enfrentamento dessas situações.",
  },
];

export const METODOLOGIA_INTRO =
  "Nossa metodologia utiliza três eixos complementares que permitem confrontar a percepção dos trabalhadores, as práticas de gestão e as informações de saúde ocupacional.";

export const ASPECTOS_METODOLOGICOS: [string, string][] = [
  ["Liberdade de escolha do método", "A NR-01 não exige questionário específico ou escala psicométrica determinada. São admitidas abordagens qualitativas, quantitativas e participativas, desde que tecnicamente fundamentadas e adequadas às condições de trabalho."],
  ["Instrumentos cientificamente validados", "Caso se utilize uma escala validada, devem ser respeitados seus procedimentos, itens e critérios de interpretação para preservar sua validação. A NR-01 não estabelece proibição literal e absoluta de alterações; modificações podem exigir nova comprovação de validade."],
  ["Natureza do nosso formulário", "O instrumento de 35 questões deve ser apresentado como formulário próprio e estruturado de percepção dos fatores de risco, e não como escala psicométrica validada, salvo existência de estudo específico de validação."],
  ["Complementação com rodas de conversa", "Resultados discrepantes, dúvidas de interpretação ou sinais relevantes podem motivar grupos focais, entrevistas, rodas de conversa e observação da atividade. Essas técnicas aprofundam a análise e não se limitam à confirmação de respostas."],
  ["Anonimato e proteção dos participantes", "A pesquisa não solicita nome, CPF, RG ou identificação pessoal direta. O setor é a unidade de análise. O QR Code facilita o acesso, mas seu bloqueio após o envio não comprova anonimato por si só. Devem ser verificados login, e-mail, IP, controle de acesso e risco de identificação indireta."],
  ["Resultados por setor", "A análise setorial permite localizar possíveis circunstâncias de exposição e propor intervenções direcionadas. Setores com poucos participantes exigem critérios de agregação ou supressão de resultados capazes de identificar pessoas."],
  ["Indicadores de saúde ocupacional", "Os dados do Eixo 03 devem ser tratados preferencialmente de forma agregada, com sigilo profissional e observância da LGPD. CID ou afastamento isolado não caracteriza automaticamente doença relacionada ao trabalho."],
  ["Fatores estruturais e organizacionais", "Distinguir fatores inerentes à atividade e fatores passíveis de intervenção gerencial auxilia a escolha dos controles. Entretanto, risco identificado não pode ser excluído do inventário apenas por ser considerado gerenciável."],
  ["Critérios da FMEA", "A matriz adaptada deve apresentar escalas documentadas e coerentes com severidade e probabilidade. Frequência de respostas não deve ser confundida automaticamente com probabilidade de agravo."],
  ["Devolutiva dos resultados", "Além da sensibilização inicial, deve existir comunicação posterior aos colaboradores sobre riscos identificados e medidas preventivas previstas, preservando o sigilo das respostas."],
  ["Acompanhamento e melhoria contínua", "O estudo deve permitir comparar resultados, avaliar a eficácia das intervenções e atualizar o gerenciamento quando necessário. Reaplicar o formulário pode ajudar, mas não substitui o acompanhamento das condições reais de trabalho."],
];

/**
 * Lembrete interno (decisão do usuário, nov/2026): o quadro acima diz que
 * frequência de respostas não deve virar probabilidade automaticamente, mas a
 * nota O da FMEA hoje é a média do Eixo 1. Fica como está; o lembrete sai só na
 * pré-visualização do relatório, nunca na versão emitida.
 */
export const NOTA_INTERNA_FMEA =
  "Nota interna (só na pré-visualização, não sai na versão emitida): o critério O (ocorrência) da FMEA usa hoje a média do Eixo 1, isto é, a frequência das respostas. O quadro acima recomenda não confundir frequência com probabilidade de agravo. Mantido assim por decisão da consultoria (nov/2026); revisar este ponto da metodologia.";

export const CORRESPONDENCIA_INTRO =
  "Nesta tabela comparativa, a conformidade é indicada como atendimento metodológico previsto, e não como certificação automática de cumprimento. A conformidade efetiva depende das evidências documentadas e da execução de cada etapa.";

export const CORRESPONDENCIA: [string, string, string][] = [
  ["NR-01 — 1.5.3.1 e 1.5.3.2.1", "Implementar o GRO e considerar as condições de trabalho da NR-17, incluindo os FRPRT.", "O projeto realiza o mapeamento específico dos fatores psicossociais relacionados ao trabalho, com integração prevista à AEP e ao GRO/PGR da organização."],
  ["NR-01 — 1.5.3.2.1 e NR-17", "Considerar os diferentes aspectos das condições de trabalho.", "Na orientação inicial, esclarecemos que a avaliação ergonômica abrange os aspectos físicos, cognitivos e organizacionais. A contratação pode delimitar um desses objetos, sem dispensar a avaliação dos demais pela empresa."],
  ["NR-01 — 1.5.3.3, alínea a", "Promover a participação dos trabalhadores e proporcionar noções básicas sobre GRO.", "Realizamos uma apresentação prévia, em formato de palestra ou conversa orientativa, abordando os fatores psicossociais, o motivo da avaliação e a importância da participação dos colaboradores."],
  ["NR-01 — 1.5.3.3, alínea b", "Consultar os trabalhadores sobre a percepção dos riscos ocupacionais.", "O Eixo 01 é estruturado por formulário de percepção, com 35 questões em 13 dimensões, permitindo manifestação individual e análise coletiva por setor."],
  ["Guia MTE 2025 — comunicação prévia", "Esclarecer antecipadamente os objetivos, a metodologia e os resultados esperados da avaliação.", "A palestra preparatória precede o acesso ao formulário, permitindo esclarecer dúvidas e incentivar respostas conscientes."],
  ["Guia MTE 2025 e orientações de 2026 — escolha da metodologia", "Adotar métodos tecnicamente adequados ao contexto, sem instrumento oficial único obrigatório.", "Utilizamos instrumento estruturado de percepção, elaborado para os objetivos do projeto, com possibilidade de aprofundamento por rodas de conversa, entrevistas e grupos focais."],
  ["NR-01 — 1.5.4.2", "Realizar levantamento preliminar de perigos e riscos.", "Planejamento e levantamento de informações sobre atividades, setores, organização do trabalho e situações previamente reconhecidas como críticas, complementados pelos três eixos."],
  ["NR-01 — 1.5.4.3.1", "Identificar perigos, possíveis agravos, fontes, circunstâncias e grupos expostos.", "As situações investigadas são relacionadas aos setores e confrontadas com os Eixos 02 e 03 para caracterizar os fatores identificados e os grupos expostos."],
  ["NR-01 — 1.5.4.4.2 e 1.5.4.4.2.1", "Determinar níveis de risco com ferramentas adequadas, combinando severidade e probabilidade.", "A matriz FMEA adaptada organiza a classificação, considerando os resultados dos eixos e critérios técnicos documentados de avaliação e priorização."],
  ["NR-01 — 1.5.4.4.5.3", "Considerar as exigências da atividade e a eficácia das medidas de prevenção.", "O Eixo 02 identifica práticas e controles; o Eixo 01 verifica a percepção dos trabalhadores. A análise técnica também deve caracterizar duração, intensidade e circunstâncias da exposição."],
  ["NR-01 — 1.5.5.4 e 1.5.5.5", "Integrar a saúde ocupacional à prevenção e analisar agravos relacionados ao trabalho.", "O Eixo 03 examina indicadores coletivos de saúde, atestados e afastamentos, identificando tendências e sinais que possam justificar aprofundamento técnico."],
  ["NR-01 — 1.5.4.4.3", "Classificar os riscos para definir medidas preventivas e sua prioridade.", "Os fatores caracterizados passam pela matriz de classificação, gerando uma hierarquização técnica das prioridades de intervenção."],
  ["NR-01 — 1.5.5.2", "Elaborar plano de ação com medidas, responsáveis, cronograma e acompanhamento.", "Os resultados fundamentam recomendações de melhorias organizacionais, com posterior consolidação no plano de ação da empresa."],
  ["NR-01 — 1.5.7.1 e 1.5.7.3", "Documentar o inventário de riscos e o plano de ação do PGR.", "O relatório técnico fornece informações sobre fatores, grupos expostos, medidas preventivas e classificação para incorporação aos documentos obrigatórios."],
  ["NR-01 — 1.5.3.3, alínea c", "Comunicar os riscos consolidados e as medidas previstas aos trabalhadores.", "Deve ser previsto retorno coletivo dos resultados e das medidas de prevenção, sem identificação individual dos participantes."],
  ["NR-01 — 1.5.4.4.6 e 1.5.5.3", "Reavaliar riscos e acompanhar a eficácia das medidas.", "A metodologia permite reaplicação e comparação de resultados. A frequência, os responsáveis e os indicadores de acompanhamento devem ser definidos pela organização."],
];

export const IMPLEMENTACAO_INTRO =
  "A implementação do processo de identificação e avaliação dos Fatores de Riscos Psicossociais Relacionados ao Trabalho (FRPRT) foi conduzida de forma estruturada e participativa, contemplando etapas de planejamento, sensibilização dos trabalhadores, levantamento de informações organizacionais e coleta de indicadores de saúde ocupacional.";

export const PASSOS: { titulo: string; paragrafos: string[] }[] = [
  {
    titulo: "Passo 1",
    paragrafos: [
      "Inicialmente, foi realizada uma reunião de alinhamento com representantes da organização, destinada ao reconhecimento preliminar das atividades desenvolvidas, dos setores e cargos existentes, bem como das particularidades dos processos de trabalho. Nessa etapa, foram definidos os agrupamentos setoriais para aplicação da pesquisa de percepção dos colaboradores, o cronograma de execução, as datas das orientações iniciais e os procedimentos para disponibilização dos formulários e coleta das informações.",
    ],
  },
  {
    titulo: "Passo 2",
    paragrafos: [
      "A etapa seguinte compreendeu a sensibilização e orientação dos colaboradores, por meio de encontros destinados ao esclarecimento dos objetivos do levantamento, dos conceitos relacionados aos riscos psicossociais no trabalho e da importância da participação consciente. Posteriormente, foram disponibilizados os formulários estruturados de percepção, assegurando-se a confidencialidade das respostas e a identificação exclusivamente dos agrupamentos setoriais necessários à análise coletiva.",
    ],
  },
  {
    titulo: "Passo 3",
    paragrafos: [
      "Após a coleta dos dados do Eixo 01 — Percepção dos Colaboradores, foram realizadas reuniões com grupos focais e entrevistas com lideranças e representantes dos setores, compondo o Eixo 02 — Condições Organizacionais e Medidas de Prevenção. Esses encontros tiveram como finalidade compreender a organização real do trabalho, as diretrizes operacionais, as exigências das atividades, as métricas utilizadas no gerenciamento dos processos, as práticas de liderança e as medidas de prevenção existentes.",
      "Foram também solicitadas e examinadas evidências documentais e informações capazes de subsidiar a análise das condições relatadas. Esse procedimento permitiu aprofundar e contextualizar os resultados da pesquisa, confrontando as percepções coletivas dos colaboradores com as práticas organizacionais e as condições efetivas de execução das atividades, sem desconsiderar eventuais divergências entre as fontes.",
    ],
  },
  {
    titulo: "Passo 4",
    paragrafos: [
      "Paralelamente, foi desenvolvido o Eixo 03 — Indicadores de Saúde Ocupacional, mediante preenchimento, pela organização, de planilha específica contendo os registros de atestados e afastamentos associados aos diagnósticos dos grupos F e Z da Classificação Internacional de Doenças (CID-10/CID-11), referentes aos últimos 12 meses. Os atestados de outros grupos da CID foram informados apenas para contagem do total de atestados, sem registro do código.",
      "Nesse levantamento, os registros foram relacionados aos respectivos setores de trabalho e acompanhados das informações disponíveis quanto à possível relação dos agravos com as atividades laborais, considerando as categorias: relacionado ao trabalho, parcialmente relacionado ao trabalho ou não relacionado ao trabalho. Essas informações constituem subsídios para análise epidemiológica e ocupacional, não representando, isoladamente, confirmação ou exclusão de nexo causal, cuja determinação depende de avaliação tecnicamente fundamentada e competência profissional específica.",
      "A execução articulada dessas etapas possibilitou a constituição de uma base de informações organizada por setor, integrando a percepção dos trabalhadores, as condições organizacionais identificadas e os indicadores de saúde disponíveis.",
      "Os dados obtidos em cada eixo foram sistematizados por meio de indicadores e escores próprios da metodologia, permitindo identificar resultados favoráveis ou desfavoráveis, tendências e situações que demandam aprofundamento técnico. O confronto dessas informações contribuiu para a identificação dos fatores de risco psicossociais potencialmente presentes nos diferentes contextos de trabalho.",
    ],
  },
  {
    titulo: "Passo 5",
    paragrafos: [
      "Os fatores identificados e tecnicamente caracterizados foram posteriormente submetidos à matriz FMEA adaptada, visando à classificação dos níveis de risco e à definição das prioridades de intervenção, conforme os critérios metodológicos estabelecidos. Por decisão metodológica, os indicadores de assédio e violência (Lei nº 14.457/2022) não recebem pontuação pela FMEA e são apresentados como termômetro organizacional.",
      "Como produto do levantamento, foi estruturada uma planilha consolidada de identificação e classificação dos FRPRT, contemplando os setores avaliados, a identificação da presença ou ausência de fatores de risco psicossociais relacionados ao trabalho e, quando caracterizados, os respectivos fatores e níveis de risco atribuídos.",
      "A apresentação individualizada dos eixos permite compreender as informações levantadas em cada etapa e constitui a base para o tópico subsequente, no qual será demonstrado o cruzamento técnico dos dados, a interpretação integrada dos resultados e a classificação dos fatores de risco psicossociais identificados, fundamentando as recomendações e as medidas preventivas propostas à organização.",
      "Para assegurar a rastreabilidade das informações, os resultados são inicialmente apresentados de forma individualizada, respeitando a estrutura dos três eixos de investigação.",
    ],
  },
];

export const EIXO2_SINTESE =
  "As entrevistas com grupo focal e lideranças foram utilizadas para validação dos dados do Eixo 01, levantamento de aspectos da organização do trabalho e identificação de justificativas acompanhadas de registros comprobatórios. O conteúdo extraído do sistema foi reorganizado em formato consolidado para facilitar a leitura gerencial e o acompanhamento das medidas propostas.";

export const PLANO_INTRO =
  "Com base nos resultados do cruzamento analítico, são definidas as ações corretivas e preventivas para os riscos psicossociais. A relação abaixo reúne as tratativas e boas práticas recomendadas sobre o tema, incluindo as ações de treinamento e conscientização.";

export const MONITORAMENTO = [
  "Em conformidade com a NR-01, especialmente os itens 1.5.5.2 e 1.5.5.3, a organização deverá assegurar a implementação, o acompanhamento e a avaliação da eficácia das medidas preventivas propostas no Plano de Ação dos Fatores de Riscos Psicossociais Relacionados ao Trabalho (FRPRT).",
  "Cada ação deverá possuir responsável definido, prazo de execução, indicadores de acompanhamento e registros que comprovem sua implementação e seus resultados.",
  "Recomenda-se o monitoramento anual do Plano de Ação, por meio de reuniões entre os responsáveis, RH, SESMT, lideranças e CIPA, quando aplicável, para verificar o cumprimento das ações, analisar indicadores organizacionais e de saúde, acompanhar a percepção dos trabalhadores e identificar a necessidade de ajustes.",
  "A reavaliação dos riscos deverá ocorrer de forma contínua, com revisão formal no máximo a cada dois anos, podendo esse prazo chegar a três anos nas condições de certificação previstas na NR-01. A revisão deverá ser antecipada sempre que houver alterações relevantes nos processos ou na organização do trabalho, identificação de medidas ineficazes, ocorrência de agravos relacionados ao trabalho, mudanças legais aplicáveis ou necessidade de avaliação dos riscos residuais após a implementação das medidas.",
  "Os resultados do monitoramento deverão ser documentados e utilizados para atualização do Inventário de Riscos Ocupacionais e do Plano de Ação do PGR, assegurando a melhoria contínua das condições de trabalho e a efetividade das medidas de prevenção.",
  "O monitoramento das ações implementadas poderá acontecer em diferentes datas conforme estipulado no plano de ação e reciclagens previstas de itens específicos.",
];

export const SEM_PGR =
  "Não foram identificadas situações inerentes à função com índice acima de 3,00 que devam ser inseridas no Programa de Gerenciamento de Riscos (PGR) neste levantamento. Os demais fatores com índice acima de 3,00, quando houver, são tratados no plano de ação.";

export const REFERENCIAS: { grupo: string; itens: string[] }[] = [
  {
    grupo: "Legislação e normas regulamentadoras",
    itens: [
      "BRASIL. Ministério do Trabalho e Emprego. Norma Regulamentadora nº 1 (NR-1): Disposições Gerais e Gerenciamento de Riscos Ocupacionais. Brasília, DF: MTE, 2026. Disponível em: https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/nr-1. Acesso em: 12 out. 2026.",
      "BRASIL. Ministério do Trabalho e Emprego. Norma Regulamentadora nº 17 (NR-17): Ergonomia. Brasília, DF: MTE, 2022. Disponível em: https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/norma-regulamentadora-no-17-nr-17/. Acesso em: 12 out. 2026.",
      "BRASIL. Ministério do Trabalho e Emprego. Norma Regulamentadora nº 7 (NR-7): Programa de Controle Médico de Saúde Ocupacional – PCMSO. Brasília, DF: MTE. Disponível em: https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras. Acesso em: 12 out. 2026.",
      "BRASIL. Ministério do Trabalho e Emprego. Portaria MTE nº 1.419, de 27 de agosto de 2024. Altera a redação do capítulo 1.5 e do Anexo I da Norma Regulamentadora nº 1. Brasília, DF: MTE, 2024.",
      "BRASIL. Ministério do Trabalho e Emprego. Portaria MTE nº 765, de 15 de maio de 2025. Prorroga o início da vigência da nova redação do capítulo 1.5 da NR-1 para 26 de maio de 2026. Brasília, DF: MTE, 2025.",
      "BRASIL. Lei nº 14.457, de 21 de setembro de 2022. Institui o Programa Emprega + Mulheres; dispõe, em seu art. 23, sobre a prevenção e o combate ao assédio sexual e a outras formas de violência no âmbito do trabalho.",
    ],
  },
  {
    grupo: "Guias técnicos e gerenciamento dos riscos psicossociais",
    itens: [
      "BRASIL. Ministério do Trabalho e Emprego. Guia de informações sobre os fatores de riscos psicossociais relacionados ao trabalho. Brasília, DF: MTE, 2025. Disponível em: https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/guia-nr-01-revisado.pdf. Acesso em: 12 out. 2026.",
      "BRASIL. Ministério do Trabalho e Emprego. Manual de interpretação e aplicação do capítulo 1.5 da NR-1: Gerenciamento de Riscos Ocupacionais (GRO). Brasília, DF: MTE, 2026. Disponível em: https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/manuais-e-publicacoes/2026/manual_gro_pgr_da_nr_1.pdf. Acesso em: 12 out. 2026.",
      "INTERNATIONAL ORGANIZATION FOR STANDARDIZATION (ISO). ISO 45003:2021: Occupational health and safety management — Psychological health and safety at work — Guidelines for managing psychosocial risks. Geneva: ISO, 2021. Disponível em: https://www.iso.org/standard/64283.html. Acesso em: 12 out. 2026.",
    ],
  },
  {
    grupo: "Saúde mental e prevenção no ambiente de trabalho",
    itens: [
      "WORLD HEALTH ORGANIZATION (WHO). WHO guidelines on mental health at work. Geneva: WHO, 2022. Disponível em: https://www.who.int/publications-detail-redirect/9789240053052. Acesso em: 12 out. 2026.",
      "WORLD HEALTH ORGANIZATION (WHO); INTERNATIONAL LABOUR ORGANIZATION (ILO). Mental health at work: policy brief. Geneva: WHO; ILO, 2022. Disponível em: https://www.who.int/publications-detail-redirect/9789240057944. Acesso em: 12 out. 2026.",
    ],
  },
  {
    grupo: "Metodologia de análise e classificação de riscos",
    itens: [
      "INTERNATIONAL ELECTROTECHNICAL COMMISSION (IEC). IEC 60812:2018: Failure modes and effects analysis (FMEA and FMECA). Geneva: IEC, 2018. Disponível em: https://webstore.iec.ch/en/publication/26359. Acesso em: 12 out. 2026.",
    ],
  },
];

export const OBSERVACAO_TECNICA = [
  "A NR-1, com as alterações vigentes desde 26 de maio de 2026, e a NR-17 constituem as principais bases normativas da avaliação. O Guia do MTE de 2025 e o Manual de 2026 complementam a interpretação e a aplicação prática do gerenciamento dos fatores de riscos psicossociais.",
  "É importante preservar uma distinção na conclusão: a ausência de registros de CID F ou Z relacionados ao trabalho não significa, isoladamente, ausência de fatores de riscos psicossociais. Os resultados dos três eixos devem ser analisados de maneira integrada, considerando as condições reais de trabalho e as oportunidades de prevenção.",
];
