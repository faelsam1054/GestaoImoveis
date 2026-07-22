# Gestão de Aluguéis

Sistema web multiusuário para controle de aluguéis de imóveis, com três perfis de
acesso — **Proprietário**, **Administrador** e **Inquilino** — permissões
granulares, controle financeiro completo, geração de PDFs (recibos e contratos),
dashboard e relatórios exportáveis.

## Stack

| Camada | Tecnologias |
|---|---|
| Backend | Node.js, Express 5, TypeScript, Prisma ORM, SQLite |
| Autenticação | JWT (access + refresh token), bcrypt, rate limiting |
| PDF | pdfkit |
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

```bash
# cria o banco SQLite e aplica as migrations
npm run db:migrate

# popular o banco com dados de demonstração (ver credenciais abaixo)
npm run db:seed
```

`db:seed` é idempotente — pode ser executado novamente sem duplicar registros.

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
| Administrador | `administrador1@sistema.com` | `demo1234` | Permissões amplas (imóveis, inquilinos, contratos, pagamentos, manutenção) |
| Administrador | `administrador2@sistema.com` | `demo1234` | Permissões restritas a leitura (sem gerenciar inquilinos) |
| Inquilino | `inquilino1@sistema.com` | `demo1234` | Possui contrato ativo, com histórico de pagamentos |
| Inquilino | `inquilino2@sistema.com` | `demo1234` | Possui contrato ativo |
| Inquilino | `inquilino3@sistema.com` | `demo1234` | Sem contrato ativo (para testar o estado "sem imóvel") |
| Inquilino | `inquilino4@sistema.com` | `demo1234` | Contrato com caução parcelada em 3x (1 parcela paga, 1 atrasada, 1 pendente) |

O seed também cria os 6 tipos de imóvel padrão (Casa, Apartamento, Kitnet, Sala
Comercial, Galpão, Terreno) e 5 imóveis: 3 com o histórico de contratos/pagamentos
padrão descrito acima, 1 com o contrato de caução parcelada do `inquilino4` e 1
**inativo** (fora de oferta, para testar o fluxo de ativar/desativar imóvel).
`administrador1` fica vinculado a 2 imóveis e `administrador2` a 1 (para testar o
acesso restrito por imóvel), além de gastos de manutenção variados e mensalidades
de administrador dos últimos 3 meses.

`db:seed` também é seguro de rodar depois de já ter usado o sistema de verdade:
ele nunca sobrescreve dados fora dos IDs/e-mails fixos que ele mesmo criou, e
não recria contratos de demonstração que já foram encerrados/rescindidos
manualmente.

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
conta). Imóveis e Inquilinos têm um ciclo de vida completo — Ativo / Inativo /
Excluído (soft delete: oculta da listagem sem apagar o histórico de contratos e
pagamentos, com opção de restaurar).

**Administrador** — reaproveita as mesmas telas do Proprietário, mas cada
módulo só aparece/é editável conforme a permissão concedida pelo Proprietário,
e cada listagem (imóveis, inquilinos, contratos, pagamentos, manutenção) é
automaticamente restrita aos imóveis vinculados a ele. Nunca tem acesso a
Dashboard, Relatórios, Configurações ou à própria mensalidade (apenas o
Proprietário vê e registra o pagamento do Administrador).

**Inquilino** — vê apenas os próprios dados: imóvel alugado com o próximo
vencimento em destaque, contrato vigente (com download em PDF — a versão
assinada enviada pelo Proprietário tem prioridade sobre a gerada
automaticamente pelo sistema), histórico de pagamentos (com download de
recibo em PDF), possibilidade de relatar um problema no imóvel (abre um
chamado de manutenção pendente de aprovação do Proprietário), e edição do
próprio perfil/senha.

### Contratos

Além do CRUD básico (criar, renovar, encerrar, rescindir), cada contrato tem
uma página de detalhe própria com:

- **Caução parcelada**: ao criar/renovar um contrato, a caução pode ser
  parcelada em até 3x. Cada parcela tem vencimento, status (pendente/pago/
  atrasado) e recibo em PDF próprio ao ser paga; parcelas já pagas não podem
  mais ser alteradas ou removidas.
- **Upload do contrato assinado**: o Proprietário/Administrador pode anexar o
  PDF do contrato fisicamente assinado (distinto do PDF gerado automaticamente
  pelo sistema), substituí-lo ou removê-lo a qualquer momento.

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
