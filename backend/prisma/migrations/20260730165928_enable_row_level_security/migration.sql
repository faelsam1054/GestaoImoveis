-- Habilita Row-Level Security em todas as tabelas do schema public.
--
-- CONTEXTO IMPORTANTE (por que nao ha policies de auth.uid() aqui):
-- Esta aplicacao NAO usa Supabase Auth nem supabase-js para acessar o
-- banco - a API propria (Express) fala com o Postgres via Prisma, com uma
-- connection string que autentica como o role "postgres" (superuser do
-- projeto Supabase, com BYPASSRLS). Toda a autorizacao por role
-- (proprietario/administrador/inquilino) ja e' aplicada no backend, nos
-- middlewares e nos services (ver acesso-imovel.service.ts etc).
--
-- O unico consumidor afetado por RLS aqui e' a API REST publica que o
-- Supabase expoe automaticamente para toda tabela do schema public
-- (PostgREST, em https://<projeto>.supabase.co/rest/v1/<tabela>), acessivel
-- com a publishable/anon key - que nao e' secreta. Com RLS desabilitado,
-- QUALQUER pessoa com essa URL (nunca teve controle de acesso nenhum) podia
-- ler/editar/apagar todas as linhas de todas as tabelas via essa API,
-- mesmo sem nunca ter usado a aplicacao. Foi confirmado na pratica: uma
-- consulta anonima a /rest/v1/Usuario retornou email e role de usuarios
-- reais antes desta migration.
--
-- Habilitar RLS sem nenhuma policy faz o Postgres negar por padrao
-- qualquer acesso via os roles "anon"/"authenticated" do PostgREST -
-- fechando esse buraco por completo - sem exigir nenhuma policy baseada em
-- auth.uid() (que sempre seria NULL aqui, ja que nenhum JWT do Supabase
-- Auth e' emitido por este app) e sem qualquer mudanca no backend: o role
-- "postgres" usado pelo Prisma continua funcionando exatamente igual,
-- porque BYPASSRLS ignora RLS no nivel do proprio Postgres.
--
-- Se no futuro este projeto passar a usar supabase-js/Supabase Auth
-- diretamente do frontend (hoje nao usa), sera necessario criar policies
-- especificas para os roles anon/authenticated nas tabelas relevantes.

ALTER TABLE "Usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RefreshToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PermissaoAdministrador" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TipoImovel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Imovel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminImovel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ImovelFoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Inquilino" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contrato" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AditivoContrato" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CaucaoParcela" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pagamento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GastoManutencao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PagamentoAdministrador" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReciboPdf" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LogAuditoria" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailEnviado" ENABLE ROW LEVEL SECURITY;
