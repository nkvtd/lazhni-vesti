import type { PageContextServer } from "vike/types";
import { getArchiveChallenges } from "../../../database/drizzle/queries/challenges";
import { getSkopjeDateString } from "../../../database/drizzle/queries/util";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: PageContextServer) {
    const items = await getArchiveChallenges(
        pageContext.db,
        pageContext.user?.id,
        371,
    );
    return { today: getSkopjeDateString(), items };
}
