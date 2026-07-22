import bcrypt from "bcrypt";
import crypto from "node:crypto";

const SALT_ROUNDS = 12;

export async function hashPassword(senha: string): Promise<string> {
  return bcrypt.hash(senha, SALT_ROUNDS);
}

export async function comparePassword(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

// Usada ao cadastrar inquilinos/administradores: gera senha temporaria
// que o usuario deve trocar no primeiro acesso (Usuario.precisaTrocarSenha).
export function gerarSenhaTemporaria(): string {
  return crypto.randomBytes(6).toString("hex");
}
