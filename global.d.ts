import type { dbPostgres } from "./database/drizzle/db";
import type { User } from "better-auth";

declare global {
  namespace Vike {
    interface PageContextServer {
      db: ReturnType<typeof dbPostgres>;
    }
    interface PageContext {
      // Set by `betterAuthSessionMiddleware`, then passed to the client via `passToClient`.
      user?: User | null;
    }
  }
}

declare module "telefunc" {
  namespace Telefunc {
    interface Context {
      db: ReturnType<typeof dbPostgres>;
    }
  }
}

// biome-ignore lint/complexity/noUselessEmptyExport: ensure that the file is considered as a module
export {};
