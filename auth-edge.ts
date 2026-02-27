import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

/**
 * Edge-safe auth instance (no Prisma/Node deps). Use this in middleware only.
 */
export const { auth } = NextAuth(authConfig);
