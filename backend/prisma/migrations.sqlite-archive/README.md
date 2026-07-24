# Migrations SQLite (arquivadas)

Estas migrations foram geradas contra o datasource `sqlite` (usado até a
migração para PostgreSQL/Supabase). O SQL delas usa sintaxe específica do
SQLite (ex: sequências de `DROP INDEX`/`DROP COLUMN` para contornar
limitações do `ALTER TABLE` do SQLite) e **não é compatível com PostgreSQL**.

Mantidas aqui só como referência histórica de como o schema evoluiu. O
Prisma não lê esta pasta (ela está fora de `prisma/migrations/`, a única que
`prisma migrate` considera) — a migration `init` em `prisma/migrations/`
gera o schema atual direto em PostgreSQL, sem depender destas.
