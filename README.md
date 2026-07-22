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

O seed também cria os 6 tipos de imóvel padrão (Casa, Apartamento, Kitnet, Sala
Comercial, Galpão, Terreno), 3 imóveis, 2 contratos ativos com ~6 meses de
histórico de pagamentos (incluindo um pagamento em atraso propositalmente, para
testar a tela de inadimplência), gastos de manutenção variados e mensalidades
de administrador dos últimos 3 meses.

## Funcionalidades por perfil

**Proprietário** — acesso total: dashboard com KPIs e gráfico de receitas x
despesas, CRUD completo de imóveis/inquilinos/contratos/pagamentos/manutenção,
cadastro de administradores com permissões granulares por checkbox, mensalidade
de administrador, tipos de imóvel, relatórios (financeiro, por imóvel,
inadimplência histórica, manutenção por categoria — todos exportáveis em
CSV, o financeiro também em PDF), configurações (dados próprios, troca de
senha, log de auditoria).

**Administrador** — reaproveita as mesmas telas do Proprietário, mas cada
módulo só aparece/é editável conforme a permissão concedida pelo Proprietário.
Nunca tem acesso a Dashboard, Relatórios, Configurações ou à própria
mensalidade (apenas o Proprietário vê e registra o pagamento do Administrador).

**Inquilino** — vê apenas os próprios dados: imóvel alugado com o próximo
vencimento em destaque, contrato vigente (com download em PDF), histórico de
pagamentos (com download de recibo em PDF), possibilidade de relatar um
problema no imóvel (abre um chamado de manutenção pendente de aprovação do
Proprietário), e edição do próprio perfil/senha.

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
