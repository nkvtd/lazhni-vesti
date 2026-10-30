import { enhance, type UniversalMiddleware } from "@universal-middleware/core";
import { getServices } from "./services";

export const servicesMiddleware: UniversalMiddleware = enhance(
    async (_request, context) => {
        return {
            ...context,
            ...getServices(),
        };
    },
    {
        name: "lv:services-middleware",
        immutable: false,
    },
);
