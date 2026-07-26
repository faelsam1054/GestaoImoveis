# Gestalugua - Sistema de Gestão de Aluguéis

Sua carteira de aluguéis organizada.

> Este projeto é conhecido internamente como GestaoImoveis (nome do repositório).

## Sobre

O Gestalugua é um sistema web multiusuário para controle de aluguéis de imóveis,
indicado para proprietários que administram um portfólio de imóveis (diretamente
ou com apoio de administradores). Principais funcionalidades:

- Três perfis de acesso — **Proprietário**, **Administrador** e **Inquilino** —
  com permissões granulares por administrador.
- Controle financeiro completo: contratos, pagamentos, cauções, multas e
  lançamentos avulsos.
- Geração de PDFs (recibos e contratos).
- Dashboard e relatórios exportáveis.

## Stack

| Camada | Tecnologias |
|---|---|
| Backend | Node.js, Express 5, TypeScript, Prisma ORM, PostgreSQL (Supabase) |
| Autenticação | JWT (access + refresh token), bcrypt, rate limiting |
| PDF | pdfkit (geração), react-pdf (pré-visualização no frontend) |
| Email | nodemailer (mockado por padrão via `EMAIL_MOCK`, ver "Variáveis de ambiente") |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, shadcn/ui |
| Dados/estado | React Query, React Router |
| Gráficos | Recharts |

## Estrutura do projeto

```
gestao-alugueis/
├── backend/     # API REST (Express + Prisma)
├── frontend/    # SPA (React + Vite)
└── package.json # orquestra os dois com um único `npm run dev`
```

## Pré-requisitos

- Node.js 20 ou superior
- npm

## Instalação

```bash
git clone <url-do-repositorio>
cd gestao-alugueis

# instala as dependências do backend e do frontend
npm run install:all

# configura as variáveis de ambiente
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Os valores padrão em `backend/.env.example` já funcionam para desenvolvimento
local. Antes de qualquer uso além de testes locais, troque `JWT_SECRET` e
`JWT_REFRESH_SECRET` por segredos fortes e únicos.

## Banco de dados

PostgreSQL (Supabase). Localmente:

```bash
# aplica as migrations no Postgres apontado por DATABASE_URL/DIRECT_URL
npm run db:migrate

# popular o banco com dados de demonstração (dev local - NUNCA rodar em produção; ver credenciais abaixo)
npm run db:seed
```

`db:seed` é idempotente — pode ser executado novamente sem duplicar registros.

**Bootstrap do Proprietário padrão em produção** (`prisma/bootstrap.ts`,
chamado automaticamente no `postinstall` a cada deploy): diferente do
`db:seed` (dados de demonstração, só para dev local), o bootstrap é o único
dado criado automaticamente em produção — exatamente **um usuário
Proprietário**, e só se o banco ainda não tiver nenhum. As credenciais vêm
das variáveis de ambiente `PROPRIETARIO_PADRAO_EMAIL`/`PROPRIETARIO_PADRAO_SENHA`
(configuradas no dashboard da Vercel, nunca commitadas); a conta nasce com
`precisaTrocarSenha=true`, forçando a troca da senha já no primeiro login.
**Troque a senha padrão imediatamente após o primeiro acesso em produção.**

**Migration `contrato_status_unificado`**: fundiu os antigos campos
`Contrato.statusAprovacao` (aprovado/pendente_aprovacao/rejeitado) e
`Contrato.ativo`/`desativadoEm` (eixo de visibilidade) dentro de um único
campo `Contrato.status`, e removeu os valores legados `rescindido`/`renovado`
(ambos viram `encerrado`). Dados existentes foram migrados automaticamente:
contratos com `statusAprovacao` pendente/rejeitado tiveram o `status`
substituído por esse valor; os demais com status legado `rescindido`/
`renovado`/`inativo` viraram `encerrado`. Rode `npm run db:migrate` para
aplicar (nenhuma ação manual necessária).

**Migration `pagamento_admin_calculado`**: adiciona a `PagamentoAdministrador`
os campos `quantidadeImoveis`/`valorTotalAlugueis`/`percentual`/`valorPrevisto`
(snapshot do cálculo automático — ver "Mensalidade do Administrador" abaixo) e
uma constraint única `(administradorId, mesReferencia)`. O status
`pendente` deixa de existir, virando `aguardando_pagamento`. Os registros
legados existentes antes desta migration recebem um backfill best-effort
(`valorPrevisto`/`valorTotalAlugueis` calculados a partir do `valorPago`
histórico, `quantidadeImoveis` fixado em 1 por não ter sido rastreado
antes) — sem perda de dados, mas sem precisão retroativa total.

## Como rodar

```bash
npm run dev
```

Isso sobe **backend** (`http://localhost:3333`) e **frontend**
(`http://localhost:5173`) juntos, com hot-reload nos dois. O frontend já tem
um proxy configurado para `/api` e `/uploads`, então não é necessário nenhuma
configuração extra em desenvolvimento.

Para rodar cada lado separadamente:

```bash
npm run dev --prefix backend
npm run dev --prefix frontend
```

Outros comandos úteis:

```bash
npm run db:studio     # abre o Prisma Studio (explorar/editar dados visualmente)
npm run build:backend # compila o backend para dist/
npm run build:frontend# gera o build de produção do frontend
```

## Credenciais de teste (após `npm run db:seed`)

| Perfil | Email | Senha | Observação |
|---|---|---|---|
| Proprietário | `admin@sistema.com` | `admin123` | Acesso total ao sistema |
| Proprietário | `proprietario2@sistema.com` | `admin123` | Segundo Proprietário — mesmo acesso total, para testar múltiplos Proprietários |
| Administrador | `administrador1@sistema.com` | `demo1234` | Permissões amplas (imóveis, inquilinos, contratos, pagamentos, manutenção) |
| Administrador | `administrador2@sistema.com` | `demo1234` | Permissões restritas a leitura (sem gerenciar inquilinos) |
| Inquilino | `inquilino1@sistema.com` | `demo1234` | Possui contrato ativo, com histórico de pagamentos |
| Inquilino | `inquilino2@sistema.com` | `demo1234` | Possui contrato ativo |
| Inquilino | `inquilino3@sistema.com` | `demo1234` | Sem contrato *aprovado* (tem uma solicitação de contrato aguardando aprovação do Proprietário — ver abaixo) |
| Inquilino | `inquilino4@sistema.com` | `demo1234` | Contrato com caução parcelada em 3x (1 parcela paga, 1 atrasada, 1 pendente) |

O seed também cria os 6 tipos de imóvel padrão (Casa, Apartamento, Kitnet, Sala
Comercial, Galpão, Terreno) e 6 imóveis: 3 com o histórico de contratos/pagamentos
padrão descrito acima, 1 com o contrato de caução parcelada do `inquilino4`, 1
**inativo** (fora de oferta, para testar o fluxo de ativar/desativar imóvel) e 1
vago com um contrato **aguardando aprovação** (cadastrado por `administrador1`
para `inquilino3` — faça login como Proprietário e veja o sino "Contratos
Pendentes" no menu, além de um email mockado correspondente em "Emails
Enviados"). `administrador1` fica vinculado a 2 imóveis e `administrador2` a 1
(para testar o acesso restrito por imóvel), além de gastos de manutenção
variados (incluindo uma limpeza **mensal recorrente**, que gera automaticamente
as próximas ocorrências ao abrir a tela de Manutenção). A mensalidade de
`administrador1` dos últimos 3 meses fechados é calculada de verdade a partir
desses dados (10% dos aluguéis de imóveis com aluguel do mês já pago — ver
"Mensalidade do Administrador" abaixo); `administrador2` nunca tem mensalidade
porque o único imóvel vinculado a ele fica vago.

`db:seed` também é seguro de rodar depois de já ter usado o sistema de verdade:
ele nunca sobrescreve dados fora dos IDs/e-mails fixos que ele mesmo criou, e
não recria contratos de demonstração que já foram encerrados manualmente.

## Funcionalidades por perfil

**Proprietário** — acesso total: dashboard com KPIs e gráfico de receitas x
despesas, CRUD completo de imóveis/inquilinos/contratos/pagamentos/manutenção,
cadastro de administradores com permissões granulares por checkbox e vínculo a
imóveis específicos (o administrador só vê/gerencia os imóveis vinculados a
ele, e tudo que depende deles — contratos, pagamentos, manutenção), mensalidade
de administrador, tipos de imóvel, relatórios (financeiro, por imóvel,
inadimplência histórica, manutenção por categoria — todos exportáveis em
CSV, o financeiro também em PDF), configurações (dados próprios, troca de
senha, log de auditoria). Pode resetar a senha de qualquer Inquilino ou
Administrador (gera uma nova senha temporária e revoga as sessões ativas da
conta).

Pode haver **múltiplos Proprietários**: qualquer Proprietário pode cadastrar
outro com o mesmo acesso total (tela "Proprietários"), com as mesmas
salvaguardas de segurança que os demais módulos (não é possível desativar,
excluir ou ficar sem nenhum Proprietário ativo no sistema, nem autoexcluir a
própria conta).

Imóveis e Inquilinos têm um ciclo de vida com 3 estados — Ativo / Inativo /
**Excluído** (soft delete: oculta da listagem sem apagar o histórico de
contratos e pagamentos, com opção de **restaurar**). Administradores e
Proprietários seguem um padrão diferente e mais recente: apenas
**Ativo / Inativo** (desativa o login ou oculta da listagem padrão, sem
"excluído" intermediário) mais uma **exclusão definitiva** (hard delete, sem
volta) — só permitida quando o registro não tem nenhuma ação/histórico
associado (senão o sistema recusa com um erro claro e sugere apenas
desativar) — protegida por confirmação dupla (checkbox + digitar um campo de
confirmação) no frontend.

Contratos têm um ciclo de vida próprio, mais simples: `pendente_aprovacao` →
`ativo`/`rejeitado` → `encerrado` (um único campo `status`, sem eixo de
visibilidade separado — ver "Contratos" abaixo).

**Aprovação de contratos**: contratos cadastrados pelo próprio Proprietário
entram em vigor imediatamente; os cadastrados por um Administrador nascem como
"aguardando aprovação" — não geram pagamentos nem ocupam o imóvel até o
Proprietário aprovar ou rejeitar (com motivo) na tela "Contratos Pendentes",
que também mostra um contador no menu lateral. Cada aprovação/rejeição/
cadastro pendente dispara um e-mail (mockado por padrão — ver `EMAIL_MOCK` em
"Variáveis de ambiente" — com histórico visível na tela "Emails Enviados").

**Administrador** — reaproveita as mesmas telas do Proprietário, mas cada
módulo só aparece/é editável conforme a permissão concedida pelo Proprietário,
e cada listagem (imóveis, inquilinos, contratos, pagamentos, manutenção) é
automaticamente restrita aos imóveis vinculados a ele. Nunca tem acesso a
Dashboard, Relatórios, Configurações, Proprietários ou à própria mensalidade
(apenas o Proprietário vê e registra o pagamento do Administrador). Contratos
que cadastra ficam pendentes de aprovação (ver acima).

**Mensalidade do Administrador**: calculada automaticamente pelo sistema, nunca
cadastrada manualmente — equivale a 10% da soma dos aluguéis dos imóveis pelos
quais o administrador é responsável (via `GET /pagamentos-admin/calcular/:administradorId/:mesReferencia`),
e só passa a existir quando **todos** os inquilinos desses imóveis já pagaram
o aluguel daquele mês (antes disso, a tela mostra a lista de quem falta pagar,
sem gerar nenhum registro). Administradores **desativados** somem
completamente da listagem de mensalidades e do cálculo — Opção A entre as
duas discutidas (esconder da listagem vs. mostrar acinzentado): o registro
histórico continua no banco (nunca é apagado), só fica invisível enquanto o
administrador estiver inativo, e volta a aparecer se ele for reativado.

**Inquilino** — vê apenas os próprios dados: imóvel alugado com o próximo
vencimento em destaque, contrato vigente (com download em PDF — a versão
assinada enviada pelo Proprietário tem prioridade sobre a gerada
automaticamente pelo sistema; só aparece depois que o contrato é aprovado),
histórico de pagamentos (com download de recibo em PDF), possibilidade de
relatar um problema no imóvel (abre um chamado de manutenção pendente de
aprovação do Proprietário), e edição do próprio perfil/senha.

### Dashboard

Todos os KPIs (total de imóveis, vagos, alugados, em manutenção, receita
esperada/recebida, despesas, inadimplência) e o gráfico de receitas x despesas
**excluem imóveis excluídos (soft delete) ou com status `inativo`** — tanto o
imóvel em si quanto qualquer pagamento/gasto de manutenção ligado a um
contrato daquele imóvel. Isso vale também para as listas "Próximos
vencimentos", "Pagamentos atrasados" e "Manutenções pendentes". A mensalidade
de administrador é a única métrica financeira do dashboard que não passa por
esse filtro (não é vinculada a um imóvel específico).

### Contratos

Um contrato tem um único campo de estado (`status`): `pendente_aprovacao` →
`ativo` (ou `rejeitado`) → `encerrado`. Não existe mais eixo separado de
visibilidade nem os estados `rescindido`/`renovado`/`inativo` de versões
anteriores — **renovar** um contrato ativo simplesmente encerra o atual e cria
um novo em `ativo`, e a listagem geral (`GET /contratos`) só retorna
`ativo`/`encerrado` (contratos `pendente_aprovacao`/`rejeitado` só aparecem na
tela dedicada "Contratos Pendentes", nunca na listagem geral) — filtrável por
3 abas (Todos/Ativo/Encerrado, cada uma com contador). Além do CRUD básico
(criar, renovar, encerrar, excluir), cada contrato tem uma página de detalhe
própria com:

- **Caução parcelada**: ao criar/renovar um contrato, a caução pode ser
  parcelada em até 3x. Cada parcela tem vencimento, status (pendente/pago/
  atrasado) e recibo em PDF próprio ao ser paga; parcelas já pagas não podem
  mais ser alteradas ou removidas.
- **Upload do contrato assinado**: opcional tanto no cadastro quanto depois —
  o Proprietário/Administrador pode anexar o PDF do contrato fisicamente
  assinado a qualquer momento (distinto do PDF gerado automaticamente pelo
  sistema), substituí-lo ou removê-lo.
- **Aditivos contratuais**: aba própria para anexar PDFs de aditivo (registrando
  alterações como reajuste de valor), com descrição e valor anterior/novo;
  disponível tanto no fluxo de renovação (vinculando ao contrato anterior)
  quanto avulso em qualquer contrato ativo. Download exige autenticação (ao
  contrário dos demais PDFs do sistema, servidos como arquivo estático).
- **Aprovação** (ver seção acima) e **exclusão definitiva**, só permitida sem
  pagamentos/parcelas de caução vinculados — na prática, restrita a contratos
  pendentes ou rejeitados.

### Manutenção

- **Editar e excluir** qualquer gasto já cadastrado (não só avançar o status):
  formulário completo reaproveitado, incluindo trocar o imóvel, corrigir um
  "pago" por engano (limpa data/forma de pagamento automaticamente, com
  confirmação) e substituir/remover o comprovante. Exclusão é soft delete
  (mantém o histórico financeiro) com confirmação dupla; o arquivo do
  comprovante, porém, é sempre apagado do disco de verdade.
- **Visualizar comprovante**: pré-visualização da primeira página do PDF
  diretamente na tela de detalhe (sem precisar baixar), além de baixar/
  substituir/remover.
- **Recorrência mensal/trimestral/semestral/anual**: ao marcar uma manutenção
  como recorrente (ex: limpeza mensal), o sistema gera automaticamente as
  próximas ocorrências (até 3 meses à frente) sempre que a tela de Manutenção é
  aberta. Cada ocorrência gerada é um gasto independente — editar, pagar ou
  excluir uma não afeta as outras. A recorrência pode ser pausada/retomada a
  qualquer momento na tela de detalhe, que também lista todas as ocorrências
  já geradas.

### Pagamentos

- **Filtros por status**: 3 abas — "Todos" (padrão), "Atrasados" e "Pagos" —
  cada uma com contador no label; ordenação padrão por vencimento mais próximo
  primeiro. "Atrasado" é sempre um pendente cujo vencimento já passou (a
  promoção pendente→atrasado é automática a cada leitura).
- **Desfazer pagamento**: reverte um "marcar como pago" feito por engano,
  voltando o status para pendente; opcionalmente remove também o recibo em PDF
  gerado (checkbox marcado por padrão no modal de confirmação).

## Segurança

- Senhas armazenadas com **bcrypt** (12 salt rounds)
- Autenticação via **JWT de acesso (15 min) + refresh token (7 dias)**; o
  refresh token fica em cookie `httpOnly`, o access token só em memória no
  frontend (nunca em `localStorage`)
- **Rate limiting** nas rotas de login/recuperação de senha (10 tentativas a
  cada 15 minutos por IP)
- **RBAC** completo: gate por perfil (`requireRole`) e por permissão granular
  do Administrador (`authorizePermissao`), replicado no frontend para a
  experiência (a validação real acontece sempre no backend)
- **Log de auditoria** de ações sensíveis (login, criação/edição/exclusão de
  registros, mudança de permissões)
- **CORS** restrito à origem do frontend (configurável via `CORS_ORIGIN`)
- Cabeçalhos de segurança via `helmet`

### HTTPS em produção

Este projeto **não implementa TLS/HTTPS diretamente** — em desenvolvimento local
isso é normal (`http://localhost`). Em produção, sirva a aplicação **sempre
atrás de HTTPS**: use um proxy reverso (Nginx, Caddy) ou a terminação TLS do
seu provedor de hospedagem, e configure `CORS_ORIGIN` para a URL `https://`
correta do frontend. Sem HTTPS, o cookie do refresh token e o token de acesso
trafegam sem criptografia — não exponha esta aplicação publicamente sem TLS.

## Variáveis de ambiente

Veja `backend/.env.example` e `frontend/.env.example` para a lista completa,
com comentários explicando cada uma.
