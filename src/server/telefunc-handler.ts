import { enhance, type UniversalHandler } from "@universal-middleware/core";
import { serve } from "telefunc";

export const telefuncHandler: UniversalHandler = enhance(
    async (request, context, runtime) => {
        const httpResponse = await serve({
            request,
            context: {
                ...context,
                ...runtime,
            },
        });
        return new Response(httpResponse.getReadableWebStream(), {
            status: httpResponse.statusCode,
            headers: httpResponse.headers,
        });
    },
    {
        name: "lv:telefunc-handler",
        path: `/_telefunc`,
        method: ["GET", "POST"],
        immutable: false,
    },
);
