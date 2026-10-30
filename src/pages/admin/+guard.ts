import { redirect, render } from "vike/abort";
import type { PageContext } from "vike/types";

export function guard(pageContext: PageContext) {
    if (!pageContext.user) {
        throw redirect("/login");
    }
    if (pageContext.user.role !== "admin") {
        throw render(403);
    }
}
