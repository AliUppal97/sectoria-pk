import { idSchema, type Id } from "@sectoria/types";

/**
 * Brands a plain database string as a validated {@link Id} at the composition
 * boundary. Prisma returns ids as plain `string`; the domain builders accept the
 * branded `Id` so a raw, unvalidated string can never reach them. This mirrors
 * the `idSchema.parse(...)` convention used in `packages/database/prisma/seed.ts`
 * (the other caller of these domain functions), kept in one helper to avoid
 * repeating the parse at every call site.
 *
 * @param value - A non-empty id string from a persisted row or generator.
 * @returns The same value, branded as `Id`.
 */
export function toId(value: string): Id {
  return idSchema.parse(value);
}
