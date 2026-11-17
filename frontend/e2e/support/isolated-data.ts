import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import type { PrismaClient } from "../../../backend/node_modules/@prisma/client";

export const runPrefix = `E2E13-${randomUUID().slice(0, 8)}`;
export type OwnedUser = { id: string; document: string; email: string };
export type Manifest = { users: OwnedUser[]; memberships: { id: string; userId: string }[] };

export function writesAuthorized() {
  return process.env.FITZONE_E2E_WRITE_AUTHORIZATION === "APPROVED_ISOLATED"
    && process.env.FITZONE_E2E_CLEANUP_APPROVED === "APPROVED_SCOPED"
    && Boolean(process.env.E2E_ISOLATED_DATABASE_URL)
    && Boolean(process.env.E2E_BASE_URL && process.env.E2E_BASE_URL !== "http://localhost:3000")
    && Boolean(process.env.E2E_API_BASE_URL && process.env.E2E_API_BASE_URL !== "http://localhost:3001/api/v1");
}

export function verifyIsolatedConfiguration() {
  if (!writesAuthorized()) throw new Error("Limpieza no autorizada: conservar manifiesto para revision.");
  const backend = path.resolve(process.cwd(), "../backend");
  const backendRequire = createRequire(path.join(backend, "package.json"));
  const dotenv = backendRequire("dotenv") as { parse: (input: Buffer) => Record<string, string> };
  const production = dotenv.parse(fs.readFileSync(path.join(backend, ".env")));
  const isolatedUrl = process.env.E2E_ISOLATED_DATABASE_URL!;
  const signature = (input: string) => {
    const url = new URL(input);
    return `${url.hostname}:${url.port}${url.pathname}:${url.username}:${url.searchParams.get("schema") ?? "public"}`;
  };
  for (const current of [production.DATABASE_URL, production.DIRECT_URL].filter(Boolean)) {
    if (signature(current) === signature(isolatedUrl)) throw new Error("La limpieza rechaza la conexion actual de Supabase.");
  }
  return { backendRequire, isolatedUrl };
}

export async function cleanupOwnedData(manifest: Manifest) {
  if (!manifest.users.length && !manifest.memberships.length) return;
  const { backendRequire, isolatedUrl } = verifyIsolatedConfiguration();
  const { PrismaClient: Client } = backendRequire("@prisma/client") as { PrismaClient: typeof PrismaClient };
  const db = new Client({ datasources: { db: { url: isolatedUrl } } });
  try {
    return await db.$transaction(async tx => {
      const ids = manifest.users.map(user => user.id);
      for (const user of manifest.users) {
        if (!user.document.startsWith(runPrefix) || !user.email.endsWith("@e2e.invalid")) throw new Error("Propiedad del fixture no comprobada.");
        const existing = await tx.user.findUnique({ where: { id: user.id } });
        if (!existing || existing.document !== user.document || existing.email !== user.email) throw new Error("Identidad del fixture no coincide.");
      }
      if (await tx.payment.count({ where: { userId: { in: ids } } })) throw new Error("Hay pagos inesperados: no se ejecuta limpieza.");
      const memberships = await tx.membership.findMany({ where: { userId: { in: ids } }, select: { id: true, userId: true } });
      if (memberships.length !== manifest.memberships.length) throw new Error("Cantidad de membresias distinta del manifiesto: detener limpieza.");
      if (memberships.some(row => !manifest.memberships.some(owned => owned.id === row.id && owned.userId === row.userId))) throw new Error("Hay membresias no registradas: detener limpieza.");
      const deletedMemberships = await tx.membership.deleteMany({ where: { id: { in: manifest.memberships.map(row => row.id) }, userId: { in: ids } } });
      const deletedUsers = await tx.user.deleteMany({ where: { id: { in: ids }, document: { startsWith: runPrefix } } });
      if (deletedMemberships.count !== manifest.memberships.length || deletedUsers.count !== ids.length) throw new Error("Recuento de limpieza inesperado: revertir transaccion.");
      return { verifiedUserIds: ids, verifiedMemberships: memberships, unexpectedPayments: 0, deletedUsers: deletedUsers.count, deletedMemberships: deletedMemberships.count, transactionCommitted: true };
    });
  } finally {
    await db.$disconnect();
  }
}
