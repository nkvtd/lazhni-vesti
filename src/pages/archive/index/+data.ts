import type { PageContextServer } from "vike/types";
import { getArchiveChallenges } from "../../../database/drizzle/queries/challenges";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: PageContextServer) {
    const items = await getArchiveChallenges(
        pageContext.db,
        pageContext.user?.id,
    );
    return { items };
}
