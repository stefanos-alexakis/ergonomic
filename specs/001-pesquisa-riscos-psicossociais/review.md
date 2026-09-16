# Revisão do plano — riscos, bugs prováveis e arquitetura de instalação

Revisão feita antes de escrever qualquer código, com base no que já quebrou de verdade nas
instalações anteriores dessa VPS (OSManager, CRM Alex, agentes AlexClaw) e na natureza específica
desta plataforma: uma pesquisa **anônima** sobre assuntos delicados (assédio, violência, pressão
de chefia) dentro da empresa onde a pessoa trabalha.

Cada item abaixo segue o mesmo formato: **o que pode dar errado** (em português claro), **por que
acontece** e **como evitar**.

---

## Parte 1 — Bugs de anonimato: os que matam o projeto

Se qualquer um destes acontecer, o estrago não é técnico, é de confiança: o colaborador descobre
que dá para saber quem respondeu o quê, e a pesquisa inteira perde o valor — além do risco legal.

### 1.1 O "ataque da subtração" nos dashboards

**O que pode dar errado:** a regra de esconder grupos com menos de 5 respostas parece resolver,
mas não resolve sozinha. Imagine: o total da empresa é 20 respostas. O painel mostra
"Administrativo: 15". O grupo "Portaria" some da tela porque tem menos de 5. Qualquer gestor faz
20 − 15 = 5 e sabe que a Portaria respondeu 5 — e se a Portaria tem exatamente 5 pessoas, ele
acabou de descobrir as respostas de todo mundo lá.

**Por que acontece:** esconder um único grupo não esconde nada quando o total é visível.

**Como evitar:** quando a regra esconder **um** grupo, ela precisa esconder também o **segundo
menor** — assim a conta de subtração não fecha. Essa lógica fica na camada de agregação e precisa
de teste automatizado específico.

### 1.2 O código de acesso viajando na URL

**O que pode dar errado:** o QR code do cartão aponta para algo como
`.../p/pesquisa?codigo=ABC123`. Esse endereço fica gravado no histórico do celular, nos registros
(logs) do servidor e é enviado para qualquer site externo que a página carregue (uma fonte do
Google, por exemplo). Quem tiver acesso a esses registros consegue ligar horário + código.

**Por que acontece:** tudo que está na URL é registrado em todo lugar por onde passa.

**Como evitar:** o QR entra por uma URL com o código, mas a primeira coisa que o servidor faz é
guardar o código num cookie seguro e **redirecionar** para uma URL limpa (`/p/pesquisa`), sem o
código. Somado a: nenhum recurso externo (fonte, script, imagem) na página do colaborador, e
cabeçalho `Referrer-Policy: no-referrer`.

### 1.3 Cruzar horário da resposta com o ponto eletrônico

**O que pode dar errado:** o sistema grava o segundo exato em que cada resposta foi enviada. O RH
tem o registro de ponto e a escala de trabalho. Cruzando "quem estava na empresa às 14h37" com
"resposta enviada às 14h37", identifica-se a pessoa.

**Por que acontece:** timestamp preciso é um identificador indireto quando combinado com outra
base de dados.

**Como evitar:** o sistema pode guardar o horário para uso operacional, mas **nenhuma exportação,
tela ou relatório** pode mostrar horário individual de resposta. Exports agregados só com data
(sem hora), e nunca uma lista que permita ordenar respostas por momento de envio.

### 1.4 O grupo que já é pequeno na origem

**O que pode dar errado:** o gestor cria a pesquisa com uma função chamada "Motorista" que tem 2
pessoas. Não importa qual regra de supressão exista depois — no momento em que a pessoa seleciona
"Motorista", ela já se identificou para qualquer um que veja os dados brutos.

**Por que acontece:** o anonimato não é garantido pela ausência de nome, e sim pelo tamanho do
grupo em que a pessoa se dilui.

**Como evitar:** duas travas. (a) No momento de criar a pesquisa, avisar o gestor que
setores/funções com poucas pessoas comprometem o anonimato e sugerir agrupar. (b) Tornar a
seleção de **segmento** e **função** opcional para o colaborador ("prefiro não informar") — a
análise por setor/departamento continua útil e ninguém é obrigado a se estreitar até virar único.

### 1.5 Logs do servidor guardando IP junto com a hora do envio

**O que pode dar errado:** o Traefik (a "portaria" do servidor) registra por padrão IP de origem,
horário e endereço acessado. Se alguém cruzar esse registro com o banco, consegue amarrar um IP a
uma resposta — e IP dentro de uma empresa costuma ser rastreável até a máquina.

**Por que acontece:** é o comportamento padrão de qualquer servidor web; ninguém desliga por acaso.

**Como evitar:** desligar o access log para as rotas públicas da pesquisa (ou anonimizar o IP), e
definir retenção curta (7 dias) para os logs restantes. Precisa estar escrito no procedimento de
instalação, senão ninguém lembra.

---

## Parte 2 — Bugs do código de acesso

### 2.1 Duas abas, um código só (condição de corrida)

**O que pode dar errado:** a pessoa abre o link no celular e no computador ao mesmo tempo, ou dá
dois cliques rápidos. O sistema tenta criar duas vezes a mesma "ficha de resposta" e estoura um
erro feio na cara do colaborador.

**Por que acontece:** a relação código ↔ resposta é de um para um; duas criações simultâneas
violam essa regra no banco.

**Como evitar:** criar a ficha de resposta com `upsert` dentro de uma transação, e tratar o erro
de duplicidade como "já existe, siga em frente" — nunca como erro de sistema.

### 2.2 Confiar no "status" em vez da data

**O que pode dar errado:** o código tem um campo de status (`DISPONIVEL`, `EXPIRADO`...). Se a
rotina automática que marca os códigos como expirados falhar numa noite, os códigos continuam
`DISPONIVEL` e a pesquisa encerrada aceita respostas.

**Por que acontece:** status guardado no banco é uma "foto" que pode ficar desatualizada; a data
de encerramento é a verdade.

**Como evitar:** a verificação de "esta pesquisa está aberta?" sempre compara com a data e hora
atual. O status `EXPIRADO` é apenas um espelho para relatório — nunca a fonte da decisão.

### 2.3 Fuso horário: a pesquisa que fecha 3 horas antes

**O que pode dar errado:** o gestor define encerramento "sexta às 18:00". O servidor grava em UTC
e fecha às 15:00 no horário de Brasília. Ninguém entende por quê.

**Por que acontece:** servidores trabalham em UTC por padrão; a pessoa pensa no horário local.

**Como evitar:** guardar sempre em UTC, converter na entrada e na exibição para o fuso do
workspace (padrão `America/Sao_Paulo`, configurável — clientes em Manaus ou no exterior existem).
Teste obrigatório: criar pesquisa às 18:00 e conferir que fecha às 18:00 locais.

### 2.4 Faltando códigos no lote

**O que pode dar errado:** o gestor pede 100 licenças, o sistema gera os códigos de uma vez só
ignorando duplicados, dois códigos aleatórios saem iguais, e são criados 99 em vez de 100 — sem
avisar ninguém. Um colaborador fica sem cartão.

**Por que acontece:** o comando de inserção em massa que ignora duplicados falha em silêncio.

**Como evitar:** depois de gerar, **conferir a contagem** e completar o que faltou, repetindo até
bater. É uma verificação de três linhas que evita um problema invisível.

### 2.5 O código que ninguém consegue digitar

**O que pode dar errado:** o código impresso no cartão tem `0` e `O`, `1` e `l`. A pessoa digita
errado, o sistema diz "código inválido", ela acha que foi excluída da pesquisa e desiste.

**Por que acontece:** alfabeto de geração não pensado para leitura humana em papel.

**Como evitar:** alfabeto sem caracteres ambíguos (ex.: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`), e o
sistema aceita a digitação com espaços, hífens e minúsculas, normalizando antes de validar.

---

## Parte 3 — Bugs da jornada paginada (a parte nova do plano)

### 3.1 A pesquisa encerra no meio do preenchimento

**O que pode dar errado:** o colaborador está na página 4 de 6 quando dá o horário de
encerramento. Pela regra atual do plano, ele é bloqueado e perde tudo que respondeu.

**Por que acontece:** a especificação dizia "bloquear novos acessos e continuação de rascunhos"
sem separar os dois casos.

**Como evitar — decisão recomendada:** quem **já começou** tem uma tolerância de 60 minutos após
o encerramento para concluir; quem **ainda não começou** é bloqueado na hora. Isso evita respostas
perdidas e não distorce nada estatisticamente. Já ajustei a `spec.md` com essa regra.

### 3.2 Duplo clique em "Concluir a pesquisa"

**O que pode dar errado:** a pessoa clica duas vezes (ou a internet oscila e ela clica de novo). A
segunda chamada encontra a pesquisa já concluída e mostra um erro, dando a impressão de que a
resposta não foi enviada.

**Como evitar:** a ação de concluir precisa ser idempotente — concluir algo já concluído devolve a
tela de agradecimento, não um erro. Além disso, desabilitar o botão no primeiro clique.

### 3.3 Perdeu o cookie, perdeu a pesquisa

**O que pode dar errado:** o colaborador fecha o navegador, limpa dados ou troca de celular. Volta,
digita o mesmo código e o sistema diz "este código já foi usado".

**Por que acontece:** confundir "código já iniciado" com "código já concluído".

**Como evitar:** código `INICIADO` sempre permite retomar de onde parou (as respostas estão
gravadas no servidor, não no navegador). Só `CONCLUIDO` bloqueia. Isso precisa de teste
automatizado explícito, porque é o tipo de coisa que quebra numa refatoração e ninguém percebe.

### 3.4 Página parcialmente respondida

**O que pode dar errado:** a pessoa responde 5 de 7 perguntas da página e clica em "Próximo". Se a
regra existir só na tela (e não no servidor), respostas incompletas entram no banco e distorcem a
estatística.

**Como evitar:** definir a regra uma vez — recomendo **obrigar a resposta de todas as perguntas da
página** antes de avançar, com destaque visual no que falta — e validar tanto na tela quanto no
servidor.

### 3.5 A tela de revisão em celular

**O que pode dar errado:** a tela de revisão mostra as 42 perguntas com as respostas numa lista
gigante. No celular vira uma rolagem interminável e a pessoa desiste no último passo.

**Como evitar:** revisão agrupada por bloco, recolhida por padrão, com destaque para "o que você
respondeu" e botão de editar que leva direto à página daquela pergunta.

---

## Parte 4 — Bugs de isolamento entre empresas

### 4.1 O formulário público aceitando dados de outra empresa

**O que pode dar errado:** a tela que o colaborador usa é pública (não exige login). Ela envia o
identificador do setor escolhido. Se o servidor não conferir se aquele setor **pertence à empresa
daquela pesquisa**, alguém mal-intencionado consegue enviar respostas marcadas com setores de
outro cliente, contaminando os dados de duas empresas.

**Por que acontece:** é fácil lembrar de proteger a área logada e esquecer que a área pública
também recebe dados.

**Como evitar:** toda rota pública valida que os identificadores recebidos pertencem ao workspace
da pesquisa daquele código. É a verificação mais importante do sistema inteiro.

### 4.2 Logo enviada pelo admin como arma

**O que pode dar errado:** o logotipo da empresa é exibido na página pública. Se o sistema aceitar
arquivo SVG, ele pode conter código executável, e esse código roda no navegador de todo
colaborador que abrir a pesquisa.

**Como evitar:** aceitar apenas PNG/JPG/WebP, validar o conteúdo real do arquivo (não só a
extensão), redimensionar no servidor e servir de um caminho isolado.

### 4.3 As cores da marca quebrando a página

**O que pode dar errado:** o campo "cor primária" é texto livre. Se alguém digitar algo que não é
uma cor, ou pior, um trecho de código CSS, a página do colaborador quebra ou vira vetor de ataque.

**Como evitar:** validar formato hexadecimal (`#RRGGBB`) na gravação e aplicar via variável CSS,
nunca concatenando texto direto no estilo. Bônus obrigatório: conferir o contraste automaticamente
— uma empresa com marca amarelo-claro não pode gerar texto ilegível.

### 4.4 A consulta que esqueceu o filtro de empresa

**O que pode dar errado:** um dia alguém escreve uma consulta nova ao banco e esquece de filtrar
pela empresa. O gestor da empresa A vê dados da empresa B.

**Como evitar:** um único auxiliar obrigatório (`scoped()`) que todas as consultas usam, mais um
teste automatizado que tenta acessar dados de outro workspace trocando o identificador na URL e
exige receber "não encontrado".

---

## Parte 5 — Bugs de estatística e relatório

### 5.1 Perguntas com sentido invertido (armadilha futura)

**O que pode dar errado:** hoje as 42 perguntas seguem a mesma lógica — quanto maior a nota, pior
o risco. Se um dia a ergonomista acrescentar uma pergunta positiva ("Você se sente apoiado?"), a
média geral passa a somar coisas opostas e o resultado fica errado **sem dar erro nenhum**.

**Como evitar:** registrar agora, no banco, um campo de polaridade em cada pergunta (padrão:
"maior = pior") e usar esse campo no cálculo. Custa quase nada agora e evita um erro silencioso
depois. Já registrei isso no `data-model.md`.

### 5.2 Códigos de teste vazando para o relatório

**O que pode dar errado:** basta uma consulta esquecer o filtro de "só participantes" para os 5
códigos de teste entrarem na estatística oficial.

**Como evitar:** não deixar essa decisão espalhada pelo código — uma única função de agregação que
já nasce filtrando participantes + respostas concluídas, e todo dashboard usa ela.

### 5.3 Divisão por zero e pesquisa vazia

**O que pode dar errado:** o gestor abre o painel no primeiro dia, sem nenhuma resposta, e vê
`NaN%` ou uma tela quebrada.

**Como evitar:** estados vazios desenhados de propósito ("ainda não há respostas suficientes"),
não como acidente.

### 5.4 Taxa de resposta confusa

**O que pode dar errado:** o gestor vê "60 respostas" sem saber se são concluídas ou começadas, e
toma decisão errada sobre prorrogar a pesquisa.

**Como evitar:** o painel sempre mostra três números separados: códigos distribuídos, pesquisas
iniciadas e pesquisas concluídas (que é o número que alimenta a estatística).

---

## Parte 6 — Bugs de instalação e deploy

Esta parte vem direto das armadilhas já registradas nas instalações anteriores desta VPS.

### 6.1 Windows quebrando scripts no Linux (risco alto e concreto)

**O que pode dar errado:** você trabalha no Windows. O Windows marca o fim de linha dos arquivos
de um jeito diferente do Linux. Quando um script vai do seu computador para a VPS, ele chega com
essas marcas invisíveis e o Linux recusa: `illegal option -`. O container entra em loop e o erro
não explica nada.

**Como evitar:** criar o arquivo `.gitattributes` com `* text=auto eol=lf` **antes** do primeiro
envio, e conferir com `cat -A entrypoint.sh` depois de qualquer transferência.

### 6.2 Nome de rota e de "middleware" colidindo com o CRM

**O que pode dar errado:** se o arquivo de configuração for copiado do CRM e os nomes internos não
forem trocados, a portaria (Traefik) fica com duas definições de mesmo nome. O sintoma é cruel: o
HTTPS simplesmente não sobe, **sem mensagem de erro clara** — exatamente a armadilha já registrada
na VPS.

**Como evitar:** nomes exclusivos desta aplicação: router `pesquisa` e `pesquisa-http`, middleware
`pesquisa-https-redirect` (o CRM usa `https-redirect` — não repetir), e o rótulo
`traefik.docker.network` presente (sem ele o HTTPS pendura sem erro).

### 6.3 O logo da empresa sumindo a cada atualização

**O que pode dar errado:** se os logotipos enviados forem gravados dentro da pasta do programa,
toda vez que a aplicação for atualizada (recriando o container) **todos os logos desaparecem**.

**Como evitar:** um volume separado e permanente só para uploads (`pesquisa_uploads`), montado na
aplicação — e incluído na rotina de backup, junto com o banco.

### 6.4 O PDF que não funciona dentro do container

**O que pode dar errado:** o plano prevê gerar relatórios em PDF usando um navegador invisível
(Playwright). A imagem base da aplicação (`node:alpine`) **não tem** esse navegador nem as
bibliotecas dele. Tudo funciona na sua máquina e falha na VPS.

**Como evitar — decisão recomendada:** usar `@react-pdf/renderer` para **tudo** (cartões e
relatórios), gerando os gráficos como imagens simples dentro do próprio PDF. Elimina a dependência
do navegador invisível e mantém a imagem Docker leve. Se algum relatório exigir gráfico complexo
demais, aí sim um container separado só para isso — mas não comece por aí.

### 6.5 Nomes de volume e projeto colidindo

**O que pode dar errado:** o volume de banco chamado só `pgdata` pode colidir com o do CRM
dependendo do nome da pasta em que o projeto foi colocado, misturando dados de aplicações
diferentes.

**Como evitar:** fixar `COMPOSE_PROJECT_NAME=pesquisa` e nomear volumes explicitamente
(`pesquisa_pgdata`, `pesquisa_uploads`).

### 6.6 Banco exposto para a internet

**O que pode dar errado:** copiar um arquivo de configuração que publica a porta do banco no
servidor deixa o PostgreSQL acessível de fora. É um convite.

**Como evitar:** o banco **não** publica porta nenhuma — vive só na rede interna, conversando
apenas com a aplicação. Acesso administrativo só por dentro do servidor.

### 6.7 Backup que nunca foi testado

**O que pode dar errado:** a rotina de backup roda todo dia, gera arquivos, e no dia em que
precisar restaurar descobre-se que os arquivos estão vazios ou incompletos.

**Como evitar:** backup diário do banco **e** do volume de uploads, com rotação, e um teste de
restauração completo antes do go-live e a cada trimestre. Backup não testado não é backup.

### 6.8b Prisma 7 exige adaptador sempre (achado durante a implementação)

**O que deu errado, de fato:** ao rodar o seed pela primeira vez contra um banco real, o
`PrismaClient` recusou subir com `new PrismaClient()` sem argumento — no Prisma 7 não existe mais
conexão implícita via `url` no `datasource`; **todo** `PrismaClient`, inclusive em scripts
avulsos como o seed, precisa ser construído com `adapter: new PrismaPg(...)`. O schema também
não aceita mais `url = env("DATABASE_URL")` no bloco `datasource` — a URL de conexão para o CLI
(`db push`/`migrate`) vai em `prisma.config.ts`, separado da que o `PrismaClient` usa em runtime.

**Como foi corrigido:** `prisma.config.ts` na raiz (mesmo padrão do CRM Alex) para o CLI, e
`prisma/seed.ts` constrói seu próprio `PrismaClient` com `@prisma/adapter-pg`, igual ao
`src/lib/db.ts` da aplicação — nenhum dos dois pode depender de conexão implícita.

**Verificado de ponta a ponta**: `prisma generate` → `prisma db push` → `seed` (42 perguntas,
2 blocos, 13 dimensões, 13 fatores) → `next start` respondendo `200` e `/api/health` com
`{"status":"ok"}`, tudo contra um PostgreSQL 16 real via Docker. Rodar o seed duas vezes não
duplica nada (upsert por id determinístico).

### 6.8 Certificado HTTPS travado por excesso de tentativas

**O que pode dar errado:** durante o ajuste da configuração, várias tentativas seguidas de emitir
o certificado esbarram no limite do Let's Encrypt e o domínio fica bloqueado por horas.

**Como evitar:** confirmar que o DNS já propagou **antes** de subir, e usar o ambiente de teste
(staging) do Let's Encrypt enquanto a configuração ainda estiver sendo ajustada.

---

## Parte 7 — Arquitetura de instalação ideal

Pensando como um prédio: a VPS é o terreno, o Docker são apartamentos isolados, o Traefik é a
portaria que recebe todo mundo da rua e encaminha para o apartamento certo — e ainda cuida do
cadeado (HTTPS).

```
                    Internet
                        │
                 pesquisa.agtrade.com.br  (DNS tipo A → IP da VPS)
                        │
        ┌───────────────▼────────────────┐
        │  TRAEFIK  (portaria, já existe)│  ← rede traefik_traefik-public
        │  HTTPS automático Let's Encrypt│
        └───────────────┬────────────────┘
                        │  (só a porta 3000, por dentro)
        ┌───────────────▼────────────────────────────────┐
        │  Stack "pesquisa"  (/opt/pesquisa-psicossocial)│
        │                                                │
        │   ┌──────────────┐        ┌─────────────────┐  │
        │   │ pesquisa-app │◄──────►│  pesquisa-db    │  │
        │   │ Next.js      │ rede   │  PostgreSQL 16  │  │
        │   │ porta 3000   │ interna│  sem porta      │  │
        │   └──────┬───────┘pesquisanet│  publicada   │  │
        │          │                └────────┬────────┘  │
        │          │                         │           │
        │   volume pesquisa_uploads    volume pesquisa_pgdata
        │        (logotipos)              (dados)        │
        └────────────────────────────────────────────────┘
                        │
        ┌───────────────▼────────────────┐
        │ Rotinas automáticas (cron)     │
        │ • backup diário 03:00          │
        │ • encerrar pesquisas vencidas  │
        └────────────────────────────────┘
```

### Convenção de nomes (fixar desde o primeiro dia)

| Item | Valor |
|---|---|
| Pasta na VPS | `/opt/pesquisa-psicossocial` |
| Nome do projeto Compose | `COMPOSE_PROJECT_NAME=pesquisa` |
| Containers | `pesquisa-app`, `pesquisa-db` |
| Rede interna | `pesquisanet` |
| Rede externa (já existe) | `traefik_traefik-public` |
| Volumes | `pesquisa_pgdata`, `pesquisa_uploads` |
| Router Traefik | `pesquisa` (HTTPS) e `pesquisa-http` (redirect) |
| Middleware | `pesquisa-https-redirect` — **não** reusar o nome do CRM |
| Banco | `pesquisa_db`, usuário `pesquisa` |

### Ordem de instalação (cada passo com verificação)

1. **Gates humanos primeiro** (não avançar sem): DNS `pesquisa.agtrade.com.br` propagado; confirmar
   o nome real da rede do Traefik na VPS (`docker network ls`) e o nome do certresolver;
   conta de e-mail (SMTP) definida para avisos ao gestor.
2. **Gerar todos os segredos do zero** (`openssl rand`), nunca reaproveitar do CRM/OSManager.
3. Enviar o código (sem `node_modules`, `.next`, `.env`) → `/opt/pesquisa-psicossocial`.
4. `docker compose up -d --build` → confirmar os dois containers `Up` e o healthcheck do banco OK.
5. Criar o esquema do banco (`prisma db push`) e rodar o seed das 42 perguntas —
   **o seed confere a contagem final (25 + 17 = 42) e falha se não bater**.
6. Criar o primeiro usuário administrador da plataforma.
7. Conferir HTTPS: `curl -sI https://pesquisa.agtrade.com.br` → `200`, certificado válido.
8. Instalar as rotinas de backup e de encerramento automático, e **testar a restauração** uma vez.
9. Checklist de aceite (R1–R10 da `spec.md`) rodado ponta a ponta com uma pesquisa de mentira e
   códigos de teste.

### Fase 2 — VPS do cliente

Mesma arquitetura, replicada inteira, com um pacote autocontido
(`PLANO-INSTALACAO-PESQUISA.md`) no mesmo formato do que você já usa: nenhum segredo real dentro,
todo valor sensível como `<PLACEHOLDER>`, gates humanos explícitos. A diferença é que lá o Traefik
pode não existir ainda — o pacote precisa cobrir essa instalação também.

### Fase 3 (futura) — o agente de IA de gestão

O agente **nunca** conversa direto com o banco. Ele vive no próprio container (padrão AlexClaw,
igual ao Chess/Salomão) e fala com a plataforma pela porta da frente: uma chave própria, permissões
limitadas ao workspace a que foi ligado, e todo acesso registrado. Isso é o que impede que um erro
do agente vire vazamento de dados de pesquisa — que, neste sistema, é a informação mais sensível
que existe.

Ponto de atenção que vem das instalações anteriores: se um dia esse agente for instalado,
**um agente com acesso a dados de pesquisa psicossocial precisa de escopo restrito por empresa**
(padrão `AgentWorkspace` do CRM), nunca o padrão do OSManager, onde a chave do agente equivale a um
gerente com acesso a tudo.

---

## Parte 8 — O que já corrigi nos outros documentos

- `spec.md` — regra de tolerância de 60 minutos para quem já iniciou quando a pesquisa encerra;
  seleção de segmento/função passa a ser opcional; código de acesso não permanece na URL.
- `data-model.md` — campo de polaridade na pergunta; nota sobre não expor horários individuais.
- `plan.md` — troca do Playwright por `@react-pdf/renderer` para relatórios; volume de uploads;
  `.gitattributes`; nomes exclusivos de Traefik.
- `tasks.md` — as verificações de segurança viraram tarefas explícitas, não "boas intenções".

## Parte 8b — Bugs reais encontrados pelo teste de navegador (Fase 2/3)

Nenhum destes apareceria em teste unitário — só apareceram porque o E2E exercitou o fluxo com
navegador de verdade, login incluído.

- **Todo login caía em `/admin`, até o do gestor.** O campo escondido do formulário de login
  tinha um destino fixo. Corrigido para decidir o destino pelo papel de quem logou.
- **Ler a sessão imediatamente após o login não funciona.** Depois de `signIn(...)`, chamar
  `auth()` na mesma execução do server action ainda vê a sessão antiga — o cookie novo só existe
  no cabeçalho da resposta que está sendo montada, não em nada que a própria requisição já leu.
  Com isso, a decisão de "para onde mandar essa pessoa" acabava sempre caindo no caso padrão.
  Corrigido consultando o usuário direto no banco pelo e-mail que ele mesmo acabou de digitar,
  em vez de depender da sessão recém-criada.

## Parte 6.9 — `@react-pdf/renderer` 4.1.6 não funciona neste ambiente (achado na Fase 4)

**O que deu errado, de fato:** o plano recomendava `@react-pdf/renderer` para os cartões e
relatórios (§6.4, para não depender de um navegador invisível dentro do container). A primeira
versão que instalei (4.1.6, a mais recente quando o `package.json` foi escrito) **quebrava em
tempo de execução** — `Cannot read properties of undefined (reading 'unitsPerEm')` — toda vez que
o PDF tentava desenhar qualquer texto, tanto em teste local quanto no servidor Next.js de verdade.
`npm run build` **não pega esse tipo de erro**: ele só compila o código, nunca executa a geração
do PDF. Só apareceu ao gerar um cartão de verdade contra o servidor rodando.

**Como foi corrigido:** atualizar para `@react-pdf/renderer@4.9.0` (a biblioteca já tinha uma boa
distância de versões entre 4.1.6 e a atual — provavelmente esse bug específico de métrica de
fonte já foi corrigido em algum ponto do caminho). Resolvido o conflito de dependência opcional
do `nodemailer` do `next-auth` com `--legacy-peer-deps` nessa instalação (peerOptional, não afeta
nada em produção porque não usamos o provedor de e-mail do NextAuth).

**Lição**: para bibliotecas que renderizam algo (PDF, imagem, gráfico), "o build passou" não é
prova de nada — é preciso gerar o artefato de verdade pelo menos uma vez antes de considerar a
funcionalidade pronta.

## Parte 3b — O bug mais sutil até agora: `.bind()` recriado a cada render

**O que dava errado, de fato:** na jornada paginada, o primeiro clique em "Próximo" de cada
página nova era **silenciosamente ignorado** — nada de erro, nada na tela, só não acontecia
nada. O segundo clique sempre funcionava. Isso aconteceria com qualquer colaborador respondendo
de verdade: ele clicaria de novo pensando que só não tinha registrado o clique, sem nunca saber
que quase perdeu tempo por causa de um detalhe de implementação.

**Causa real:** cada tela usa `salvarPaginaAction.bind(null, workspaceSlug, pesquisaSlug,
respostaId, numeroDaPagina)` para "pré-preencher" os parâmetros que o formulário não manda
sozinho. `.bind()` cria uma **função nova** a cada vez que o componente renderiza. O
`useActionState` do React precisa de uma referência estável da função para controlar
corretamente o estado de "operação em andamento" — como a referência mudava a cada render, a
primeira submissão de cada página nova ficava com o estado interno desincronizado e era
descartada.

**Como foi encontrado:** só apareceu no teste de navegador de ponta a ponta (`jornada-colaborador.spec.ts`),
clicando de verdade e avançando pelas 7 páginas. Nenhum teste unitário passaria perto disso — é
puramente uma interação entre React e o navegador.

**Como foi corrigido:** envolver o `.bind()` em `useMemo`, recalculando só quando os parâmetros
de verdade mudam (não a cada render). Aplicado nos três formulários da jornada pública que usam
esse padrão.

**Bônus — um bug do próprio teste, não do produto:** ao investigar, o teste original usava
`page.waitForLoadState("networkidle")` para esperar a navegação entre páginas. Isso **não é um
sinal confiável** no Next.js App Router: a troca de página aqui é feita via API de histórico do
navegador, sem os eventos clássicos de carregamento que "networkidle" observa. Troquei por
`page.waitForURL(...)`, que espera a URL mudar de fato. Vale registrar porque é fácil escrever um
teste que "passa" só por sorte de tempo, ou "falha" apontando pro código errado quando o problema
é a própria espera do teste — coloquei um log de depuração no servidor durante a investigação e
confirmei que a aplicação sempre recebeu exatamente as chamadas certas, na ordem certa; o
problema todo estava em como o teste esperava a resposta.

## Parte 6.10 — Testes automatizados apagando um upload real (achado em produção local)

**O que deu errado, de fato:** `src/lib/upload.ts` sempre gravava em `public/uploads/`, sem
distinguir "rodando os testes" de "rodando de verdade". `src/lib/__tests__/upload.test.ts` grava
arquivos PNG/JPEG minúsculos (8-12 bytes, só a assinatura binária) para testar a validação — e
esses arquivos de mentira foram parar na mesma pasta onde o logo real de uma empresa estava
salvo. Numa limpeza de rotina de teste (`rm -rf public/uploads`, tratando a pasta como
descartável), o logo real foi apagado numa sessão sem eu perceber a diferença entre "lixo de
teste" e "dado real" — só descobri quando o usuário reportou a imagem quebrada.

**Como foi corrigido:** `salvarLogoWorkspace` agora aceita `process.env.UPLOADS_DIR` para
redirecionar onde grava; o teste cria uma pasta temporária isolada (`mkdtemp`) antes de rodar e
apaga só ela depois — nunca mais toca em `public/uploads` de verdade. Também não apago mais essa
pasta nas minhas limpezas de sessão.

**Lição**: dado gerado por upload de usuário é dado real desde o primeiro upload, mesmo em
ambiente de desenvolvimento — tratar uma pasta de armazenamento como "descartável" só porque o
ambiente é local foi o erro.

## Parte 6.11 — Cartões com link único por pesquisa (mudança a pedido do usuário)

O QR e o link impresso no cartão eram únicos por **código** (`?codigo=` embutido). A pedido do
usuário, passaram a ser únicos por **pesquisa** — todo cartão da mesma pesquisa mostra o mesmo QR
e o mesmo endereço; só o "SEU CÓDIGO DE ACESSO" muda, impresso como texto para digitar. Efeito
colateral bom: um único QR gerado por pesquisa (não mais um por código) deixou a geração do PDF
mais rápida e o arquivo menor. `src/lib/cartoes-pdf.tsx`.

## Parte 6.12 — UX da jornada do colaborador (pedido do usuário)

Pedido: mostrar o nome/logo da empresa, o título do bloco, numeração sequencial de verdade
(1 a 42, não reiniciando por página), linhas separando os campos de formulário e mais espaço
entre perguntas. Implementado reaproveitando os mesmos componentes de UI já usados na área
administrativa (`src/components/ui/*`):
- `layout.tsx` novo na rota `/p/[workspaceSlug]/[pesquisaSlug]` — cabeçalho com logo/nome,
  compartilhado por todas as telas da jornada (código, organização, questionário, revisão,
  encerrada, concluído).
- Numeração usa `Pergunta.ordemGlobal` (já existia no schema) em vez de recalcular por página —
  corrige o "reinicia a cada página" que o usuário reclamou.
- Opções de resposta viraram "chips" clicáveis (rádio nativo escondido com `sr-only` + rótulo
  estilizado) — mais fácil de tocar no celular que um rádio pequeno, e mostra a seleção com
  destaque sólido.
- 🐛 O padrão `sr-only` quebrou o teste E2E que clicava direto no `<input>` escondido — Playwright
  não conseguia, porque o `<label>` visível por cima intercepta o clique. Corrigido no teste para
  clicar no rótulo (é como uma pessoa de verdade interage mesmo). Não é bug do produto.

## Parte 6.13 — Regressão de build que quase passou despercebida

Ao corrigir a Parte 6.10 (isolar a pasta de upload nos testes), a primeira versão trocou o
caminho de destino do arquivo por uma expressão condicional (`process.env.UPLOADS_DIR || join(...)`).
Isso passou no `tsc` e nos testes, mas o `next build` (Turbopack) acusou aviso de "dynamic
filesystem access" — o rastreador de arquivos do build deixa de conseguir provar qual pasta é
usada e, por segurança, empacota o **projeto inteiro** no artefato de deploy (lento, e pode
estourar limite de tamanho em produção). Corrigido separando a função em duas: `validarImagem`
(pura, sem tocar em disco — é o que o teste usa) e `salvarLogoWorkspace` (grava sempre no caminho
fixo `public/uploads`, sem condicional). Build voltou a compilar sem avisos.

**Lição, de novo**: `npm run build` (não só `tsc`/testes) precisa rodar depois de qualquer mudança
em código que toca no sistema de arquivos — esse tipo de regressão só aparece ali.

## Parte 3c — Sessão vazando entre colaboradores no mesmo aparelho (bug real, relatado pelo usuário)

**O que dava errado, de fato:** desde que os cartões passaram a compartilhar o mesmo link por
pesquisa (Parte 6.11), o link "nu" (sem `?codigo=`) confiava cegamente no cookie
`codigoAcessoId`, se ele existisse, para decidir o que mostrar — inclusive "Obrigado, sua
resposta já foi registrada". Isso funciona bem quando cada pessoa usa o próprio aparelho. Mas
quando **duas pessoas usam o mesmo aparelho em sequência** (computador ou tablet compartilhado no
chão de fábrica, por exemplo) — cenário real e esperado num ambiente de trabalho — a segunda
pessoa herdava a sessão da primeira e via "já respondida" sem nunca ter digitado código nenhum.

**Como foi corrigido**, a pedido explícito do usuário: o link em si **nunca mais decide nada
sozinho**. Ele sempre mostra a tela de código. Só depois que alguém digita um código de verdade é
que o sistema verifica se aquele código específico já foi usado, está bloqueado, etc. — a
verificação virou uma propriedade do **código digitado**, nunca do **link acessado** ou de um
cookie deixado por outra pessoa.

Mecanicamente: todo redirecionamento interno (depois de validar um código, salvar a organização,
concluir) agora leva a `?pagina=1` em vez do link nu — esse parâmetro é o sinal de "essa
navegação já vem de dentro do próprio fluxo, pode confiar no cookie agora". O link nu (sem esse
parâmetro) ignora o cookie de propósito.

**Testado**: reproduzi o cenário exato no mesmo navegador (mesmos cookies) — pessoa A conclui,
pessoa B abre o mesmo link em seguida e digita o *próprio* código: cai numa pesquisa em branco,
não em "já respondida". Virou teste automatizado permanente
(`e2e/jornada-colaborador.spec.ts`).

## Parte 6.14 — Polimento de interação (guia emilkowalski-design) + cor personalizada da empresa

**Polimento de interação**: aplicado o framework de decisão de animação do guia
`emilkowalski-design` na jornada do colaborador — curva de ease-out custom
(`cubic-bezier(0.23,1,0.32,1)`), feedback de pressão (`active:scale`) em botões e chips,
transições específicas por propriedade (nunca `transition: all`), entrada suave por página
(`anim-fade-up`), e o acordeão da revisão de respostas trocou de `<details>`/`<summary>` nativo
(sem transição possível) para `<div>` + `<button>` controlado por estado React, animado com o
truque `grid-template-rows: 0fr → 1fr`. Testado antes numa rota de prévia isolada
(`/preview/design-polish`, removida após aprovação) sem tocar nos arquivos reais.

**Cor personalizada da empresa não aparecia em lugar nenhum** além de uma linha fina no cabeçalho
da jornada — usuário reportou que mudar a cor no cadastro da empresa não refletia em botões nem
nas linhas divisórias, nem na área de gestão. Causa: só o header lia `workspace.corPrimaria`;
todo o resto (botão primário, chip selecionado, barra de progresso, bordas de cartão, linhas
divisórias, topbar do gestor) tinha zinc-900/zinc-200 fixos no código.

Corrigido com duas variáveis CSS (`--ws-line` para linhas, `--ws-accent` para botões/destaques),
setadas no layout da jornada (`layout.tsx`) e no `AppShell` da área de gestão (nova prop
`accentColor`), com fallback embutido em cada consumidor (`var(--ws-accent,#18181b)`) — sem cor
cadastrada, o visual fica idêntico ao anterior (zinc-900 = `#18181b`). Verificado no navegador com
a empresa Alexakis (`corPrimaria: #0853b4`): header, cartão de código e botão "Continuar" saem
todos na cor certa.

## Parte 6.15 — Nome de pesquisa duplicado permitia colidir a URL pública (bug real, relatado pelo usuário)

**O que dava errado**: `criarPesquisa` gerava o slug da URL a partir do nome e, se já existisse
outro com o mesmo slug na mesma empresa, resolvia sozinho anexando um sufixo numérico
(`pesquisa-x`, `pesquisa-x-2`, ...) — permitindo criar duas pesquisas com o **mesmo nome
visível** mas URLs diferentes, sem avisar o gestor. Usuário testou criar duas pesquisas
"Ergonomic" com o mesmo nome e o sistema deixou passar silenciosamente.

**Corrigido** conforme a preferência explícita do usuário (rejeitar, não desambiguar sozinho):
antes de gerar o slug, `criarPesquisa` agora verifica se já existe uma pesquisa com o mesmo nome
(case-insensitive) na mesma empresa e recusa a criação com
`"Já existe uma pesquisa com esse nome nesta empresa. Escolha um nome diferente."`. O sufixo
numérico no slug continua existindo só como rede de segurança para nomes diferentes que geram o
mesmo slug (ex. acentuação), não como caminho normal.

**Testado**: `e2e/gestor-pesquisa.spec.ts` agora cria uma pesquisa, tenta criar outra com o nome
idêntico na mesma empresa e confirma a mensagem de erro + que a navegação não sai da tela de
criação. Suíte completa (43 unit + 7 E2E) passando.

## Parte 6.16 — Cor secundária cadastrada não aparecia (bug real, relatado pelo usuário)

**O que dava errado**: `--ws-accent`/`--ws-line` (Parte 6.14) cobriam botões e linhas com
`corPrimaria`, mas as áreas cinza-claras (trilho da barra de progresso na jornada, cabeçalho de
tabela na área de gestão) continuavam com zinc-100/zinc-50 fixo — `corSecundaria` do cadastro não
era lida em lugar nenhum.

**Achado no meio da correção**: `globals.css` tinha um bloco `:root { --ws-primary; --ws-secondary;
}` órfão de um scaffold anterior (confirmado por busca: nenhum consumidor no projeto usava essas
variáveis). Ao introduzir `--ws-secondary` de verdade, esse `:root` teria feito o fallback
embutido em cada consumidor (`var(--ws-secondary,#f4f4f5)`) nunca disparar — variável CSS já
definida globalmente sempre vence o valor de fallback, então empresas *sem* `corSecundaria`
cadastrada mostrariam o teal antigo (`#edf1ef`) em vez do cinza neutro esperado. Removido antes de
declarar a correção pronta.

**Corrigido**: nova variável `--ws-secondary`, setada junto das outras no layout da jornada e no
`AppShell` (nova prop `secondaryColor`), aplicada ao trilho da barra de progresso
(`questionario.tsx`) e ao cabeçalho das tabelas da área de gestão (`Thead`). De propósito **não**
cai de volta para `corPrimaria` quando falta `corSecundaria` — senão o trilho ficaria da mesma cor
do preenchimento e a barra sumiria visualmente. `Badge` ficou de fora por decisão: sua cor
cinza-clara ali é semântica (estado "neutro" de status como RASCUNHO/ENCERRADA), não decorativa —
trocar por marca da empresa confundiria o significado.

**Testado**: confirmado no navegador com a empresa Alexakis (`corSecundaria: #56c9fb`) — a
variável resolve certo dentro da jornada e um elemento fora do wrapper cai no fallback neutro
(`#f4f4f5`), provando que a remoção do `:root` órfão funcionou. `tsc`, 43 testes unitários e
`next build` limpos.

## Parte 9 — Decisões que ainda dependem de você

1. **Tolerância de 60 minutos** no encerramento: concorda com o número? (Alternativa: bloquear
   na hora, aceitando perder respostas em andamento.)
2. **Segmento e função opcionais** para o colaborador: isso reduz risco de identificação, mas
   também reduz o detalhe da análise. Sua área é ergonomia — essa escolha é sua, não minha.
3. **Tamanho da página** do questionário: 7 perguntas por página dá 6 páginas. Prefere menos
   páginas com mais perguntas (10 por página = 5 páginas)?
4. **Limite de supressão**: 5 respostas é o padrão que sugeri. Em empresas pequenas isso pode
   esconder quase tudo — vale definir com o cliente caso a caso.

## Parte 10 — Preparação para o primeiro deploy: bugs reais só visíveis rodando a imagem de produção

O `Dockerfile`/`docker-compose.yml`/`entrypoint.sh` já existiam de um trabalho anterior (Fase 7,
nunca testados de ponta a ponta). Antes de publicar em `pesquisa.agtrade.com.br`, buildei a
imagem localmente e subi o container de verdade contra um Postgres real — nenhum destes bugs
aparecia em `tsc`, `vitest` ou `next build`, só rodando a imagem:

1. **`npm ci` sem `--legacy-peer-deps`** — quebrava o build logo na primeira camada (mesmo
   conflito nodemailer/next-auth do ambiente local, nunca propagado pro Dockerfile).
2. **`.dockerignore` inexistente** — o build mandava `node_modules`/`.next`/`.git` inteiros como
   contexto (1.3GB+, ~3-4min só de transferência). Criado.
3. **Dois `npm install` separados na etapa runner** — o segundo "podava" o que o primeiro tinha
   acabado de instalar (`prisma` sumia), porque nenhum dos dois estava declarado no
   `package.json` minimalista que o `next build` standalone gera. Unificados.
4. **`prisma`/`tsx` são devDependencies, e `NODE_ENV=production` já estava setado na imagem** —
   isso faz o `npm install` omitir devDependencies por padrão, mesmo pedidas explicitamente na
   linha de comando. Rodar com `--include=dev` resolve, mas reconcilia contra o `package.json`
   inteiro do projeto e traz TODA devDependency (vitest, playwright, eslint, tailwind...) — inflava
   a imagem de ~300MB pra 2.7GB. Corrigido instalando num diretório isolado (`package.json`
   próprio, vazio) e copiando só o resultado — imagem final ficou em 1.16GB.
5. **`cp -r node_modules/* destino/`** não copia `.bin/` (começa com ponto, `*` não pega
   dotfiles) — trocado por `cp -r node_modules/. destino/`.
6. **`prisma db push --skip-generate`** — Prisma 7 removeu essa flag; o `entrypoint.sh` quebrava
   logo na primeira subida do container. Removida (generate já roda no build, não precisa pular
   nada em runtime).
7. **`npx prisma db seed` não achava comando de seed** — Prisma 7 moveu essa config de
   `package.json` (`"prisma": {"seed": ...}`, ainda existe mas não é mais lido) pra
   `prisma.config.ts` (`migrations.seed`). Nunca dava erro localmente porque `npm run db:seed`
   chama `tsx prisma/seed.ts` direto, sem passar por esse caminho — só apareceu testando o
   comando exato que o `quickstart.md` documentava pra VPS.
8. **`ERR_MODULE_NOT_FOUND: @prisma/driver-adapter-utils`** — copiar só
   `node_modules/@prisma/{client,adapter-pg}` isolados perde pacotes irmãos internos que o npm
   hoisteia soltos em `node_modules/@prisma/*`. Trocado por copiar o escopo `@prisma` inteiro do
   builder.
9. **`scripts/create-admin.ts` nunca era copiado pro runner** — `npm run admin:create` (bootstrap
   do primeiro PLATFORM_ADMIN) falharia na hora H, na VPS, sem nenhum sinal de alerta antes disso.
   Adicionado ao Dockerfile.

**Verificado de ponta a ponta localmente** antes de publicar: build da imagem, `docker compose`
equivalente (app + Postgres real), `prisma db push` automático no boot, `prisma db seed` (42
perguntas), `npm run admin:create`, e login de administrador real via navegador — tudo passou.
Suíte completa (43 unit + `tsc` + `next build`) também revalidada depois de todas as correções.

Código publicado em <https://github.com/stefanos-alexakis/ergonomic> — repositório criado pelo
usuário, primeiro commit e push feitos nesta sessão.
