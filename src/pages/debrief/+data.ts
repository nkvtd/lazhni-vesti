import { redirect } from "vike/abort";
import type { PageContextServer } from "vike/types";
import { getChallengeForClient } from "../../database/drizzle/queries/challenges";
import { getSkopjeDateString } from "../../database/drizzle/queries/util";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: PageContextServer) {
    const today = getSkopjeDateString();
    const challenge = await getChallengeForClient(
        pageContext.db,
        today,
        pageContext.user?.id,
    );

    if (!challenge) throw redirect("/");
    if (!challenge.completed) throw redirect("/play");

    return { challenge, today };
}
