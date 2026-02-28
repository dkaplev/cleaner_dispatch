import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

/**
 * Build connection string with SSL compat for Supabase/Vercel.
 * Prisma 7 + pg treat sslmode=require as strict verify-full, which fails on Supabase's cert.
 * Adding uselibpqcompat=true uses libpq semantics so the connection succeeds.
 */
function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const hasParams = url.includes("?");
  const separator = hasParams ? "&" : "?";
  if (url.includes("uselibpqcompat=")) return url;
  return `${url}${separator}uselibpqcompat=true`;
}

export function getPrisma() {
  const connectionString = getConnectionString();
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}
