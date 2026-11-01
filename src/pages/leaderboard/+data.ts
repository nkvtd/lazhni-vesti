import type { PageContextServer } from "vike/types";
import { getLeaderboardsData } from "../../database/drizzle/queries/leaderboard";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: PageContextServer) {
    return getLeaderboardsData(pageContext.db);
}
