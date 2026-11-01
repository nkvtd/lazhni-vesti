import { redirect } from "vike/abort";
import type { PageContext } from "vike/types";

export function guard(pageContext: PageContext) {
    if (!pageContext.user) {
        throw redirect("/login");
    }
}
