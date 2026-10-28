import type { dbPostgres } from "../database/drizzle/db";
import { enhance, type UniversalHandler } from "@universal-middleware/core";
import { serve } from "telefunc";

// Note: You can directly define a server middleware instead of defining a Universal Middleware. (You can remove @universal-middleware/* — Vike's scaffolder uses it only to simplify its internal logic, see https://github.com/vikejs/vike/discussions/3116)
export const telefuncHandler: UniversalHandler = enhance(
  async (request, context, runtime) => {
    const httpResponse = await serve({
      request,
      context: {
        ...(context as { db: ReturnType<typeof dbPostgres> }),
        ...runtime,
      },
    });
    return new Response(httpResponse.getReadableWebStream(), {
      status: httpResponse.statusCode,
      headers: httpResponse.headers,
    });
  },
  {
    name: "my-app:telefunc-handler",
    path: `/_telefunc`,
    method: ["GET", "POST"],
    immutable: false,
  },
);
