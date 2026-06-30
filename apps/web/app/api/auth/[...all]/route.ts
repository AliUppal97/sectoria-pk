import { handlers } from "@/auth";

/**
 * Auth.js v5 route handler. The single `handlers` export (GET/POST) replaces the
 * v4 `[...nextauth]` options-object pattern — see auth.ts for the config.
 */
export const { GET, POST } = handlers;
