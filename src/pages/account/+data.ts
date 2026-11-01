import type { PageContextServer } from "vike/types";
import { getUserAccountData } from "../../database/drizzle/queries/gamification";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: PageContextServer) {
    // biome-ignore lint/style/noNonNullAssertion: <guarded by +guard.ts>
    const user = pageContext.user!;
    const accountData = await getUserAccountData(pageContext.db, user.id);

    return {
        user,
        ...accountData,
    };
}
