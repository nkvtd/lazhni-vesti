import { readFileSync } from "node:fs";
import process from "node:process";
import { parseEnv } from "node:util";

export function loadEnv(file = ".env"): void {
    try {
        if (typeof process.loadEnvFile === "function") {
            process.loadEnvFile(file);
        } else {
            for (const [key, value] of Object.entries(
                parseEnv(readFileSync(file, "utf8")),
            )) {
                process.env[key] ??= value;
            }
        }
    } catch {
        // `.env` is optional — fall back to the ambient environment.
    }
}

loadEnv();
