import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

// Roda a cada deploy (ver postinstall no package.json) mas so tem efeito uma
// vez: se ja existe QUALQUER Proprietario no banco, nao faz nada. Ao
// contrario do seed.ts (dados de demonstracao pro dev local, nunca chamado
// automaticamente), este script e o UNICO dado criado automaticamente em
// producao - exatamente 1 usuario Proprietario, pra permitir o primeiro
// login e cadastro dos demais usuarios.
async function main() {
  const emailPadrao = process.env.PROPRIETARIO_PADRAO_EMAIL ?? "admin@imovelclaro.com";
  const senhaPadrao = process.env.PROPRIETARIO_PADRAO_SENHA ?? "Mudar@123";

  const existente = await prisma.usuario.findFirst({ where: { role: "proprietario" } });
  if (existente) {
    console.log(`Proprietario ja existe (${existente.email}) - bootstrap nao faz nada.`);
    return;
  }

  const senhaHash = await bcrypt.hash(senhaPadrao, SALT_ROUNDS);
  const proprietario = await prisma.usuario.create({
    data: {
      nome: "Administrador",
      email: emailPadrao,
      senhaHash,
      role: "proprietario",
      ativo: true,
      precisaTrocarSenha: true, // forca troca de senha no primeiro login
    },
  });

  console.log(`Proprietario padrao criado: ${proprietario.email}`);
  if (!process.env.PROPRIETARIO_PADRAO_SENHA) {
    console.warn(
      "AVISO: PROPRIETARIO_PADRAO_SENHA nao foi definida - usando senha padrao previsivel " +
        '("Mudar@123"). Configure essa variavel de ambiente e troque a senha imediatamente ' +
        "apos o primeiro login.",
    );
  }
}

main()
  .catch((err) => {
    // Nunca derruba o deploy inteiro (postinstall) por causa disso - so loga.
    // Um banco temporariamente inalcancavel no momento do build nao deveria
    // impedir a aplicacao de subir; o bootstrap so nao roda dessa vez.
    console.error("Falha ao rodar o bootstrap do Proprietario padrao (nao fatal):", err.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
