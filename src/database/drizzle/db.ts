import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schemaRelations from "./relations";
import * as schemaTables from "./schema";

const fullSchema = {
    ...schemaTables,
    ...schemaRelations,
};

const globalForDb = globalThis as unknown as {
    db?: ReturnType<typeof createDb>;
};

function createDb() {
    if (!process.env.DATABASE_URL) {
        throw new Error("Missing DATABASE_URL in .env file");
    }
    return drizzlePostgres(postgres(process.env.DATABASE_URL, { max: 10 }), {
        schema: fullSchema,
    });
}

export function dbPostgres() {
    globalForDb.db ??= createDb();
    return globalForDb.db;
}

export type db = ReturnType<typeof dbPostgres>;
