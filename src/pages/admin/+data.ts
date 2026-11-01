import type { PageContextServer } from "vike/types";
import {
    getPendingStagedArticles,
    getUpcomingAndPublishedChallenges,
} from "../../database/drizzle/queries/staging";
import { getSkopjeDateString } from "../../database/drizzle/queries/util";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: PageContextServer) {
    const [stagedArticles, upcomingChallenges] = await Promise.all([
        getPendingStagedArticles(pageContext.db),
        getUpcomingAndPublishedChallenges(pageContext.db),
    ]);

    return {
        today: getSkopjeDateString(),
        stagedArticles,
        upcomingChallenges,
    };
}
